<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/MessagingService.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'CLI only']);
    exit;
}

$enabled = strtolower((string)(getenv('SMS_DLR_POLLING_ENABLED') ?: 'true'));
if (!in_array($enabled, ['1', 'true', 'yes', 'on'], true)) {
    echo "DLR polling disabled\n";
    exit(0);
}

$batchSize = (int)(getenv('SMS_DLR_POLL_BATCH') ?: 20);
$batchSize = max(1, min(100, $batchSize));
$minAgeMinutes = (int)(getenv('SMS_DLR_POLL_MIN_AGE_MINUTES') ?: 10);
$minAgeMinutes = max(0, min(1440, $minAgeMinutes));

$apiKey = getenv('SYSTEM_SMS_API_KEY') ?: getenv('SMS_API_KEY') ?: '';
$partnerId = getenv('SYSTEM_SMS_PARTNER_ID') ?: getenv('SMS_API_SECRET') ?: '';
if ($apiKey === '' || $partnerId === '') {
    echo "Missing SMS credentials\n";
    exit(1);
}

$baseUrl = getenv('SYSTEM_SMS_BASE_URL') ?: getenv('SMS_API_BASE_URL') ?: 'https://sms.wicaalinvestments.com';
$dlrUrl = rtrim($baseUrl, '/') . '/api/services/getdlr';

function columnExists($pdo, $table, $column) {
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
        return $stmt->rowCount() > 0;
    } catch (Exception $e) {
        return false;
    }
}

$hasSentAt = columnExists($pdo, 'message_recipients', 'sent_at');
$hasCreatedAt = columnExists($pdo, 'message_recipients', 'created_at');
$hasDeliveryStatus = columnExists($pdo, 'message_recipients', 'delivery_status');
$hasDeliveryTimestamp = columnExists($pdo, 'message_recipients', 'delivery_timestamp');
$hasErrorMessage = columnExists($pdo, 'message_recipients', 'error_message');

$ageClause = '';
if ($minAgeMinutes > 0) {
    if ($hasSentAt) {
        $ageClause = "AND sent_at <= (NOW() - INTERVAL {$minAgeMinutes} MINUTE)";
    } elseif ($hasCreatedAt) {
        $ageClause = "AND created_at <= (NOW() - INTERVAL {$minAgeMinutes} MINUTE)";
    }
}

$sql = "
    SELECT id, external_message_id
    FROM message_recipients
    WHERE channel = 'sms'
      AND status IN ('sent', 'pending')
      AND external_message_id IS NOT NULL
      AND external_message_id <> ''
      AND (" . ($hasDeliveryStatus ? "delivery_status IS NULL OR delivery_status = ''" : "1=1") . ")
      {$ageClause}
    ORDER BY " . ($hasSentAt ? "sent_at" : ($hasCreatedAt ? "created_at" : "id")) . " DESC
    LIMIT {$batchSize}
";

$stmt = $pdo->query($sql);
$rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

if (empty($rows)) {
    echo "No pending DLRs\n";
    exit(0);
}

$updated = 0;
$messagingService = $GLOBALS['messagingService'] ?? null;

foreach ($rows as $row) {
    $messageId = $row['external_message_id'];
    if (!$messageId) {
        continue;
    }

    $postData = [
        'apikey' => $apiKey,
        'partnerID' => $partnerId,
        'messageID' => $messageId
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $dlrUrl,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($postData),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $result = json_decode($response, true);
    if (is_array($result)) {
        $result['_http_code'] = $httpCode;
    }

    if ($messagingService) {
        $messagingService->logApiRequest('getdlr', $postData, $result, $curlError ?: null);
    }

    if ($curlError) {
        continue;
    }

    $responseCode = $result['response-code'] ?? null;
    if ($responseCode != 200) {
        continue;
    }

    $deliveryDescription = $result['delivery-description'] ?? $result['delivery_description'] ?? null;
    $deliveryStatus = strtoupper((string)$deliveryDescription);
    if ($deliveryStatus === '') {
        continue;
    }

    $ourStatus = 'sent';
    if (str_contains($deliveryStatus, 'DELIVERED')) {
        $ourStatus = 'delivered';
    } elseif (str_contains($deliveryStatus, 'EXPIRED')) {
        $ourStatus = 'expired';
    } elseif (str_contains($deliveryStatus, 'FAILED') || str_contains($deliveryStatus, 'UNDELIV') || str_contains($deliveryStatus, 'REJECT')) {
        $ourStatus = 'failed';
    }

    $setParts = ["status = ?"];
    $params = [$ourStatus];

    if ($hasDeliveryStatus) {
        $setParts[] = "delivery_status = ?";
        $params[] = $deliveryDescription;
    }
    if ($hasDeliveryTimestamp) {
        $setParts[] = "delivery_timestamp = NOW()";
    }
    if ($hasErrorMessage && $ourStatus !== 'delivered') {
        $setParts[] = "error_message = ?";
        $params[] = $deliveryDescription;
    }

    $params[] = $messageId;
    $updateSql = "UPDATE message_recipients SET " . implode(', ', $setParts) . " WHERE external_message_id = ?";
    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->execute($params);
    if ($updateStmt->rowCount() > 0) {
        $updated++;
    }
}

echo "DLR poll complete. Updated {$updated} message(s).\n";
