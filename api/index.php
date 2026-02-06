<?php
/**
 * API Router - Main entry point for all API requests
 * Routes all /api/* requests to appropriate handlers
 */

// Load composer autoload for PHPMailer (if exists)
$composerAutoload = __DIR__ . '/vendor/autoload.php';
if (file_exists($composerAutoload)) {
    require_once $composerAutoload;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/Storage.php';
require_once __DIR__ . '/MessagingService.php';

// Initialize storage instance (Storage.php should create $storage at the end)
if (!isset($storage)) {
    $storage = new Storage();
}

// Initialize messaging service
if (!isset($messagingService)) {
    $messagingService = new MessagingService();
}

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api', '', $path); // Remove /api prefix

// Remove leading/trailing slashes
$path = trim($path, '/');

// Get path segments
$segments = explode('/', $path);
$endpoint = $segments[0] ?? '';
$id = null;
$action = null;

// Smart routing: For auth endpoints, second segment is action (login, check, logout)
// For other endpoints, second segment is usually ID
if (count($segments) > 1) {
    if ($endpoint === 'auth') {
        // /api/auth/login -> endpoint='auth', action='login'
        $action = $segments[1] ?? null;
    } else {
        // /api/properties/123 -> endpoint='properties', id='123'
        // /api/properties/123/disable -> endpoint='properties', id='123', action='disable'
        $id = $segments[1] ?? null;
        $action = $segments[2] ?? null;
    }
}

// Get request body (only for POST/PUT requests)
$body = [];
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $body = getJsonBody();
}

// Helper function to get query parameters
function getQuery($key, $default = null) {
    return $_GET[$key] ?? $default;
}

function parsePermissions($permissionsRaw) {
    if (empty($permissionsRaw)) {
        return [];
    }
    if (is_array($permissionsRaw)) {
        return $permissionsRaw;
    }
    if (is_string($permissionsRaw)) {
        $trimmed = trim($permissionsRaw);
        if ($trimmed === '') {
            return [];
        }
        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }
        return array_values(array_filter(array_map('trim', explode(',', $trimmed))));
    }
    return [];
}

function isLandlordRole($role) {
    $normalized = strtolower(trim((string)$role));
    return $normalized === 'landlord' || $normalized === 'client';
}

function hasPermissionCategory($permissions, $category) {
    if (in_array($category, $permissions, true)) {
        return true;
    }
    foreach ($permissions as $permission) {
        if (strpos($permission, $category . '.') === 0) {
            return true;
        }
    }
    return false;
}

function getPropertyIdByLease($storage, $leaseId) {
    if (!$leaseId) return null;
    $lease = $storage->getLease($leaseId);
    if (!$lease) return null;
    $unit = $storage->getUnit($lease['unit_id'] ?? null);
    return $unit['property_id'] ?? null;
}

function getPropertyIdByTenant($storage, $tenantId) {
    if (!$tenantId) return null;
    $leases = $storage->getLeasesByTenant($tenantId);
    if (!is_array($leases) || empty($leases)) return null;
    $activeLease = null;
    foreach ($leases as $lease) {
        if (($lease['status'] ?? '') === 'active') {
            $activeLease = $lease;
            break;
        }
    }
    $targetLease = $activeLease ?? $leases[0];
    return getPropertyIdByLease($storage, $targetLease['id'] ?? null);
}

function generateTenantAccessCode($length = 8) {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $max = strlen($alphabet) - 1;
    $bytes = random_bytes($length);
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= $alphabet[ord($bytes[$i]) % ($max + 1)];
    }
    return $code;
}

function shouldRequireOtpForUser($user, $loginType = null) {
    $role = strtolower(trim((string)($user['role'] ?? 'landlord')));
    $userOtpEnabled = isset($user['otp_enabled']) ? ((int)$user['otp_enabled'] === 1) : false;

    if ($loginType === 'admin') {
        return $userOtpEnabled;
    }

    if ($loginType === 'client') {
        return true;
    }

    if ($role === 'admin' || $role === 'super_admin' || $role === 'administrator') {
        return $userOtpEnabled;
    }

    return $userOtpEnabled;
}

function generateLoginOtpCode() {
    return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function sendLoginOtp($storage, $messagingService, $userId, $tenantId, $recipientName, $email, $phone) {
    $latest = $storage->getLatestLoginOtp($userId, $tenantId);
    if (!empty($latest['last_sent_at'])) {
        $lastSentAt = DateTimeImmutable::createFromFormat(
            'Y-m-d H:i:s',
            $latest['last_sent_at'],
            new DateTimeZone('UTC')
        );
        $lastSentTs = $lastSentAt ? $lastSentAt->getTimestamp() : null;
        $nowTs = null;
        try {
            global $pdo;
            if (isset($pdo)) {
                $row = $pdo->query("SELECT UNIX_TIMESTAMP(NOW()) AS ts")->fetch(PDO::FETCH_ASSOC);
                $nowTs = isset($row['ts']) ? (int)$row['ts'] : null;
            }
        } catch (Throwable $e) {
            $nowTs = null;
        }
        $nowTs = $nowTs ?? time();
        if ($lastSentTs && ($nowTs - $lastSentTs) < 30) {
            $retryAfter = 30 - ($nowTs - $lastSentTs);
            $retryAfter = max(1, min(30, $retryAfter));
            return ['error' => 'OTP recently sent', 'retryAfter' => $retryAfter];
        }
    }

    $code = generateLoginOtpCode();
    $codeHash = password_hash($code, PASSWORD_BCRYPT);
    $expiresAt = date('Y-m-d H:i:s', time() + 300);
    $otpId = $storage->createLoginOtp($userId, $tenantId, $codeHash, $expiresAt);
    if (!$otpId) {
        return ['error' => 'OTP storage not configured'];
    }

    $channels = [];
    $message = "Your LeaseMaster login OTP is {$code}. It expires in 5 minutes.";
    $emailSubject = "Your LeaseMaster login OTP";
    $emailBody = "<p>Your LeaseMaster login OTP is <strong>{$code}</strong>.</p><p>It expires in 5 minutes.</p>";
    $recipientType = $tenantId ? 'tenant' : 'landlord';
    $propertyId = $tenantId ? getPropertyIdByTenant($storage, $tenantId) : null;
    if ($userId && !$propertyId) {
        $user = $storage->getUser($userId);
        $propertyId = $user['property_id'] ?? null;
    }

    if ($phone) {
        $smsResult = $messagingService->sendSystemOtpSMS($phone, $message);
        $smsLogId = $messagingService->logMessage([
            'channel' => 'sms',
            'recipientContact' => $phone,
            'status' => !empty($smsResult['success']) ? 'sent' : 'failed',
            'messageCategory' => 'otp',
            'recipientType' => $recipientType,
            'recipientName' => $recipientName,
            'content' => $message,
            'propertyId' => $propertyId,
            'tenantId' => $tenantId,
            'externalMessageId' => $smsResult['messageId'] ?? null,
            'senderShortcode' => getenv('SYSTEM_SMS_SHORTCODE') ?: 'AdvantaSMS',
            'sentByUserId' => $userId
        ]);
        if (empty($smsResult['success'])) {
            $messagingService->updateMessageStatus($smsLogId, 'failed', $smsResult['error'] ?? 'SMS delivery failed');
        }
        if (!empty($smsResult['success'])) {
            $channels[] = 'sms';
        }
    }

    if ($email && filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $emailResult = $messagingService->sendEmail($email, $recipientName, $emailSubject, $emailBody, true);
        $emailLogId = $messagingService->logMessage([
            'channel' => 'email',
            'recipientContact' => $email,
            'status' => !empty($emailResult['success']) ? 'sent' : 'failed',
            'messageCategory' => 'otp',
            'recipientType' => $recipientType,
            'recipientName' => $recipientName,
            'subject' => $emailSubject,
            'content' => $emailBody,
            'propertyId' => $propertyId,
            'tenantId' => $tenantId,
            'externalMessageId' => $emailResult['messageId'] ?? null,
            'sentByUserId' => $userId
        ]);
        if (empty($emailResult['success'])) {
            $messagingService->updateMessageStatus($emailLogId, 'failed', $emailResult['error'] ?? 'Email delivery failed');
        }
        if (!empty($emailResult['success'])) {
            $channels[] = 'email';
        }
    }

    if (empty($channels)) {
        return ['error' => 'No delivery channels available'];
    }

    return ['otpId' => $otpId, 'channels' => $channels];
}

function sendTenantLoginDetails($storage, $messagingService, $tenantId, $options = []) {
    $tenant = $storage->getTenant($tenantId);
    if (!$tenant) {
        return ['success' => false, 'error' => 'Tenant not found'];
    }

    $generateNew = $options['generateNew'] ?? true;
    $sendSms = $options['sendSms'] ?? true;
    $sendEmail = $options['sendEmail'] ?? true;

    $password = $generateNew ? generateTenantAccessCode(10) : null;
    if (!$password) {
        return ['success' => false, 'error' => 'Password generation is required'];
    }

    $storage->setTenantPortalAccess($tenantId, $password, true);
    if ($storage->columnExists('tenants', 'tenant_password_hash')) {
        $storage->setTenantPassword($tenantId, $password);
    }

    $profile = $storage->getTenantPortalProfile($tenantId);
    $propertyId = $profile['property_id'] ?? getPropertyIdByTenant($storage, $tenantId);

    $loginUrl = $options['loginUrl'] ?? "https://tenants.theleasemaster.com/login";

    $identifier = $tenant['email'] ?? $tenant['phone'] ?? 'your registered contact';
    $tenantName = $tenant['full_name'] ?? 'Tenant';
    $smsMessage = "Greetings {$tenantName}, your LeaseMaster Tenant Portal access is ready. Your credentials are as follows:\n";
    $smsMessage .= "Portal: {$loginUrl}\n";
    $smsMessage .= "Username: {$identifier}\n";
    $smsMessage .= "Password: {$password}\n";
    $smsMessage .= "(do not share this message with anyone)";

    $emailSubject = "Tenant Portal Login Details";
    $emailBody = "<html><body>";
    $emailBody .= "<p>Greetings " . htmlspecialchars($tenantName) . ", your LeaseMaster Tenant Portal access is ready. Your credentials are as follows:</p>";
    $emailBody .= "<p><strong>Username:</strong> {$identifier}<br/>";
    $emailBody .= "<strong>Password:</strong> {$password}<br/>";
    $emailBody .= "(do not share this message with anyone)</p>";
    $emailBody .= "<p>Sign in here:<br/><a href='{$loginUrl}'>{$loginUrl}</a></p>";
    $emailBody .= "<p>Warm Regards,<br/>LeaseMaster Management.</p>";
    $emailBody .= "</body></html>";

    $sendResults = ['sms' => null, 'email' => null];
    $sentByUserId = $_SESSION['userId'] ?? null;
    $senderShortcode = getenv('SYSTEM_SMS_SHORTCODE') ?: 'AdvantaSMS';

    if ($sendSms && !empty($tenant['phone'])) {
        $smsResult = $messagingService->sendSystemSMS($tenant['phone'], $smsMessage);
        $sendResults['sms'] = $smsResult;
        $messagingService->logMessage([
            'channel' => 'sms',
            'recipientContact' => $tenant['phone'],
            'status' => $smsResult['success'] ? 'sent' : 'failed',
            'messageCategory' => 'tenant_login_credentials',
            'recipientType' => 'tenant',
            'recipientName' => $tenant['full_name'] ?? null,
            'content' => $smsMessage,
            'propertyId' => $propertyId,
            'externalMessageId' => $smsResult['messageId'] ?? null,
            'senderShortcode' => $senderShortcode,
            'sentByUserId' => $sentByUserId,
            'tenantId' => $tenantId
        ]);
    }

    if ($sendEmail && !empty($tenant['email'])) {
        $emailResult = $messagingService->sendEmail($tenant['email'], $tenant['full_name'] ?? 'Tenant', $emailSubject, $emailBody, true);
        $sendResults['email'] = $emailResult;
        $messagingService->logMessage([
            'channel' => 'email',
            'recipientContact' => $tenant['email'],
            'status' => $emailResult['success'] ? 'sent' : 'failed',
            'messageCategory' => 'tenant_login_credentials',
            'recipientType' => 'tenant',
            'recipientName' => $tenant['full_name'] ?? null,
            'subject' => $emailSubject,
            'content' => $emailBody,
            'propertyId' => $propertyId,
            'externalMessageId' => $emailResult['messageId'] ?? null,
            'sentByUserId' => $sentByUserId,
            'tenantId' => $tenantId
        ]);
    }

    $anySent = ($sendResults['sms']['success'] ?? false) || ($sendResults['email']['success'] ?? false);

    return [
        'success' => $anySent,
        'tenant' => $tenant,
        'profile' => $profile,
        'accessCode' => $password,
        'sent' => $sendResults
    ];
}

function generatePasswordResetToken() {
    return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
}

function hashPasswordResetToken($token) {
    return hash('sha256', $token);
}

function buildPasswordResetUrl($accountType, $token) {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $isLocalhost = str_contains($host, 'localhost') || str_contains($host, '127.0.0.1');
    if ($isLocalhost && $host) {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $path = $accountType === 'tenant' ? '/tenant/reset' : '/portal/reset';
        return "{$protocol}://{$host}{$path}?token={$token}";
    }

    if ($accountType === 'tenant') {
        return "https://tenants.theleasemaster.com/tenant/reset?token={$token}";
    }

    return "https://portal.theleasemaster.com/portal/reset?token={$token}";
}

function buildTenantAccountNumber($propertyPrefix, $unitNumber) {
    $prefix = strtoupper(trim((string) $propertyPrefix));
    $unit = strtoupper(trim((string) $unitNumber));
    if ($prefix === '' || $unit === '') {
        return null;
    }
    return $prefix . $unit;
}

function getMpesaAccessToken($settings) {
    $consumerKey = $settings['consumer_key'] ?? null;
    $consumerSecret = $settings['consumer_secret'] ?? null;
    if (!$consumerKey || !$consumerSecret) {
        throw new Exception("M-Pesa consumer key/secret not configured.");
    }
    $credentials = base64_encode($consumerKey . ':' . $consumerSecret);
    $ch = curl_init("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Basic {$credentials}"
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $result = curl_exec($ch);
    if ($result === false) {
        throw new Exception("Failed to connect to M-Pesa token endpoint.");
    }
    $response = json_decode($result, true);
    if (empty($response['access_token'])) {
        throw new Exception("Failed to retrieve M-Pesa access token.");
    }
    return $response['access_token'];
}

function sendMpesaStkPush($settings, $payload) {
    $shortcode = $settings['shortcode'] ?? null;
    $passkey = $settings['passkey'] ?? null;
    $callbackUrl = $settings['stk_callback_url'] ?? null;
    if (!$shortcode || !$passkey || !$callbackUrl) {
        throw new Exception("M-Pesa STK settings incomplete.");
    }
    $timestamp = date('YmdHis');
    $password = base64_encode($shortcode . $passkey . $timestamp);
    $accessToken = getMpesaAccessToken($settings);

    $body = [
        "BusinessShortCode" => $shortcode,
        "Password" => $password,
        "Timestamp" => $timestamp,
        "TransactionType" => "CustomerPayBillOnline",
        "Amount" => $payload['amount'],
        "PartyA" => $payload['phone'],
        "PartyB" => $shortcode,
        "PhoneNumber" => $payload['phone'],
        "CallBackURL" => $callbackUrl,
        "AccountReference" => $payload['accountNumber'],
        "TransactionDesc" => $payload['description'] ?? "LeaseMaster Payment"
    ];

    $ch = curl_init("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer {$accessToken}",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $result = curl_exec($ch);
    if ($result === false) {
        throw new Exception("Failed to send STK push request.");
    }
    $response = json_decode($result, true);
    if (empty($response['CheckoutRequestID'])) {
        throw new Exception("STK push failed: " . ($response['errorMessage'] ?? 'Unknown error'));
    }
    return $response;
}

function sendTenantPaymentConfirmation($storage, $messagingService, $propertyId, $tenantId, $amount) {
    if (!$propertyId || !$tenantId) return;
    $alerts = $storage->getAlertSettings($propertyId, null);
    if (!is_array($alerts)) return;
    $rule = null;
    foreach ($alerts as $alert) {
        if (($alert['recipient_type'] ?? '') === 'tenant' && ($alert['alert_type'] ?? '') === 'payment_confirmation') {
            $rule = $alert;
            break;
        }
    }
    if (!$rule) return;

    $tenant = $storage->getTenant($tenantId);
    if (!$tenant) return;

    $message = "Payment received. Amount: KSh {$amount}. Thank you.";
    $sentByUserId = $_SESSION['userId'] ?? null;

    if (!empty($rule['enable_sms']) && !empty($tenant['phone'])) {
        $smsResult = $messagingService->sendPropertySMS($propertyId, $tenant['phone'], $message);
        if (!empty($smsResult['success'])) {
            $messagingService->logMessage([
                'channel' => 'sms',
                'recipientContact' => $tenant['phone'],
                'status' => 'sent',
                'messageCategory' => 'system',
                'recipientType' => 'tenant',
                'recipientName' => $tenant['full_name'] ?? null,
                'content' => $message,
                'propertyId' => $propertyId,
                'tenantId' => $tenantId,
                'externalMessageId' => $smsResult['messageId'] ?? null,
                'sentByUserId' => $sentByUserId
            ]);
            $storage->recordCreditUsage([
                'landlordId' => null,
                'propertyId' => $propertyId,
                'channel' => 'sms',
                'units' => 1,
                'meta' => json_encode(['recipient' => $tenant['phone'], 'category' => 'payment_confirmation'])
            ]);
        }
    }

    if (!empty($rule['enable_email']) && !empty($tenant['email'])) {
        $emailResult = $messagingService->sendEmail($tenant['email'], $tenant['full_name'] ?? null, "Payment received", $message);
        if (!empty($emailResult['success'])) {
            $messagingService->logMessage([
                'channel' => 'email',
                'recipientContact' => $tenant['email'],
                'status' => 'sent',
                'messageCategory' => 'system',
                'recipientType' => 'tenant',
                'recipientName' => $tenant['full_name'] ?? null,
                'subject' => 'Payment received',
                'content' => $message,
                'propertyId' => $propertyId,
                'tenantId' => $tenantId,
                'externalMessageId' => $emailResult['messageId'] ?? null,
                'sentByUserId' => $sentByUserId
            ]);
            $newBalance = $storage->adjustEmailCreditBalance($propertyId, null, -1);
            $storage->recordCreditUsage([
                'landlordId' => null,
                'propertyId' => $propertyId,
                'channel' => 'email',
                'units' => 1,
                'balanceAfter' => $newBalance,
                'meta' => json_encode(['recipient' => $tenant['email'], 'category' => 'payment_confirmation'])
            ]);
        }
    }
}

// Route handler
try {
    // ========== HEALTH CHECK ==========
    if ($endpoint === 'health') {
        if ($method === 'GET') {
            try {
                // Test database connection
                $testResult = $storage->testConnection();
                sendJson([
                    'status' => 'ok',
                    'database' => $testResult ? 'connected' : 'disconnected',
                    'timestamp' => date('Y-m-d H:i:s')
                ], 200);
            } catch (Exception $e) {
                sendJson([
                    'status' => 'error',
                    'database' => 'disconnected',
                    'error' => $e->getMessage(),
                    'timestamp' => date('Y-m-d H:i:s')
                ], 500);
            }
        }
    }
    
    // ========== AUTHENTICATION ==========
    elseif ($endpoint === 'auth') {
        if ($action === 'login' && $method === 'POST') {
            if (empty($body['username']) || empty($body['password'])) {
                sendJson(['error' => 'Username and password are required'], 400);
            }
            $loginType = $body['loginType'] ?? null;
            
            $user = $storage->getUserByUsername($body['username']);
            if (!$user) {
                sendJson(['error' => 'Invalid username or password'], 401);
            }
            
            // Check if account is blocked (security feature)
            $status = $user['status'] ?? 1; // Default to 1 (active) if status column doesn't exist
            if ($status == 2) {
                $blockedUntil = isset($user['blocked_until']) ? strtotime($user['blocked_until']) : null;
                $now = time();
                
                if ($blockedUntil && $blockedUntil > $now) {
                    $hoursRemaining = round(($blockedUntil - $now) / 3600, 1);
                    sendJson([
                        'error' => 'Account blocked due to multiple failed login attempts',
                        'message' => "Your account has been blocked. Please wait {$hoursRemaining} hours or contact admin.",
                        'blockedUntil' => $user['blocked_until']
                    ], 403);
                } else {
                    // 24 hours passed, unblock account
                    $storage->unblockUser($user['id']);
                    $user = $storage->getUser($user['id']); // Refresh user data
                    $status = $user['status'] ?? 1;
                }
            }
            
            // Check password
            $isValid = false;
            if (strpos($user['password'], '$2') === 0) {
                // Bcrypt hashed password
                $isValid = password_verify($body['password'], $user['password']);
            } else {
                // Plain text (for development)
                $isValid = $user['password'] === $body['password'];
            }
            
            if (!$isValid) {
                // Increment failed login attempts (security feature)
                $loginAttempts = ($user['login_attempts'] ?? 0) + 1;
                $storage->recordFailedLoginAttempt($user['id'], $loginAttempts);
                
                if ($loginAttempts >= 5) {
                    // Block account for 24 hours
                    $blockedUntil = date('Y-m-d H:i:s', strtotime('+24 hours'));
                    $storage->blockUser($user['id'], $blockedUntil);
                    
                    sendJson([
                        'error' => 'Account blocked',
                        'message' => 'Too many failed login attempts. Your account has been blocked for 24 hours. Please contact admin for assistance.',
                        'blockedUntil' => $blockedUntil
                    ], 403);
                } else {
                    $remaining = 5 - $loginAttempts;
                    sendJson([
                        'error' => 'Invalid username or password',
                        'message' => "Invalid credentials. {$remaining} attempt(s) remaining before account is blocked."
                    ], 401);
                }
            }
            
            $updatedUser = $storage->getUser($user['id']);
            $otpRequired = shouldRequireOtpForUser($updatedUser, $loginType);
            if ($otpRequired) {
                $otpResult = sendLoginOtp(
                    $storage,
                    $messagingService,
                    $updatedUser['id'],
                    null,
                    $updatedUser['full_name'] ?? $updatedUser['username'],
                    $updatedUser['username'],
                    $updatedUser['phone'] ?? null
                );
                if (!empty($otpResult['error'])) {
                    $status = isset($otpResult['retryAfter']) ? 429 : 500;
                    sendJson(['error' => $otpResult['error'], 'retryAfter' => $otpResult['retryAfter'] ?? null], $status);
                }
                $_SESSION['pendingUserId'] = $updatedUser['id'];
                $_SESSION['pendingOtpId'] = $otpResult['otpId'];
                sendJson([
                    'otpRequired' => true,
                    'channels' => $otpResult['channels'],
                    'retryAfter' => 60
                ]);
            }

            // Successful login - reset login attempts and update status (security feature)
            $storage->recordSuccessfulLogin($user['id']);
            
            // Set session
            $_SESSION['userId'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            if (!empty($loginType)) {
                $_SESSION['loginType'] = $loginType;
            }
            
            // Check if user must change password (for landlords on first login)
            $mustChangePassword = false;
            if (isset($updatedUser['must_change_password'])) {
                $mustChangePassword = $updatedUser['must_change_password'] == 1;
            }
            
            sendJson([
                'success' => true, 
                'user' => [
                    'id' => $updatedUser['id'], 
                    'username' => $updatedUser['username'],
                    'role' => $updatedUser['role'] ?? 'landlord',
                    'mustChangePassword' => $mustChangePassword,
                    'propertyId' => $updatedUser['property_id'] ?? null,
                    'permissions' => $updatedUser['permissions'] ?? null,
                    'propertyLimit' => $updatedUser['property_limit'] ?? null
                ]
            ]);
        }

        if ($action === 'tenant-login' && $method === 'POST') {
            $identifier = $body['identifier'] ?? '';
            $password = $body['password'] ?? '';
            if (empty($identifier) || empty($password)) {
                sendJson(['error' => 'Email/phone and password are required'], 400);
            }

            $tenant = $storage->authenticateTenant($identifier, $password);
            if (!$tenant) {
                sendJson(['error' => 'Invalid login details'], 401);
            }

            $profile = $storage->getTenantPortalProfile($tenant['id']);
            $otpResult = sendLoginOtp(
                $storage,
                $messagingService,
                null,
                $tenant['id'],
                $tenant['full_name'] ?? 'Tenant',
                $tenant['email'] ?? null,
                $tenant['phone'] ?? null
            );
            if (!empty($otpResult['error'])) {
                $status = isset($otpResult['retryAfter']) ? 429 : 500;
                sendJson(['error' => $otpResult['error'], 'retryAfter' => $otpResult['retryAfter'] ?? null], $status);
            }

            $_SESSION['pendingTenantId'] = $tenant['id'];
            $_SESSION['pendingOtpId'] = $otpResult['otpId'];

            sendJson([
                'otpRequired' => true,
                'channels' => $otpResult['channels'],
                'retryAfter' => 60
            ]);
        }

        if ($action === 'request-password-reset' && $method === 'POST') {
            $identifier = trim((string)($body['identifier'] ?? ''));
            $accountType = $body['accountType'] ?? 'client';
            if ($identifier === '') {
                sendJson(['error' => 'Identifier is required'], 400);
            }

            $storage->deleteExpiredPasswordResetTokens();
            $token = generatePasswordResetToken();
            $tokenHash = hashPasswordResetToken($token);
            $expiresAt = date('Y-m-d H:i:s', strtotime('+60 minutes'));

            if ($accountType === 'tenant') {
                $tenant = $storage->getTenantByContact($identifier);
                if ($tenant) {
                    $contact = $tenant['email'] ?? $tenant['phone'] ?? null;
                    $channel = $tenant['email'] ? 'email' : ($tenant['phone'] ? 'sms' : null);
                    if ($contact) {
                        $storage->createPasswordResetToken(null, $tenant['id'], $tokenHash, $expiresAt, $channel, $contact);
                        $resetUrl = buildPasswordResetUrl('tenant', $token);
                        $message = "Reset your LeaseMaster tenant password using this link (expires in 60 minutes): {$resetUrl}";
                        if (!empty($tenant['email'])) {
                            $messagingService->sendEmail($tenant['email'], $tenant['full_name'] ?? 'Tenant', "Tenant Password Reset", $message);
                        }
                        if (!empty($tenant['phone'])) {
                            $messagingService->sendSystemSMS($tenant['phone'], $message);
                        }
                    }
                }
            } else {
                $user = $storage->getUserByUsername($identifier);
                $role = strtolower(trim((string)($user['role'] ?? 'landlord')));
                if ($user && isLandlordRole($role)) {
                    $contact = $user['username'] ?? null;
                    if ($contact) {
                        $storage->createPasswordResetToken($user['id'], null, $tokenHash, $expiresAt, 'email', $contact);
                        $resetUrl = buildPasswordResetUrl('client', $token);
                        $message = "Reset your LeaseMaster client password using this link (expires in 60 minutes): {$resetUrl}";
                        $messagingService->sendEmail($contact, $user['full_name'] ?? null, "Client Password Reset", $message);
                    }
                }
            }

            sendJson(['success' => true]);
        }

        if ($action === 'reset-password' && $method === 'POST') {
            $token = trim((string)($body['token'] ?? ''));
            $newPassword = (string)($body['newPassword'] ?? '');
            $accountType = $body['accountType'] ?? 'client';
            if ($token === '' || strlen($newPassword) < 8) {
                sendJson(['error' => 'Valid token and password are required'], 400);
            }

            $tokenHash = hashPasswordResetToken($token);
            $record = $storage->getPasswordResetToken($tokenHash);
            if (!$record) {
                sendJson(['error' => 'Invalid or expired token'], 400);
            }
            if (!empty($record['used_at']) || strtotime($record['expires_at']) < time()) {
                sendJson(['error' => 'Token expired'], 400);
            }

            if ($accountType === 'tenant') {
                if (empty($record['tenant_id'])) {
                    sendJson(['error' => 'Invalid token'], 400);
                }
                $storage->setTenantPassword($record['tenant_id'], $newPassword);
            } else {
                if (empty($record['user_id'])) {
                    sendJson(['error' => 'Invalid token'], 400);
                }
                $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
                $storage->setUserPassword($record['user_id'], $hashedPassword, false);
            }

            $storage->markPasswordResetTokenUsed($record['id']);
            sendJson(['success' => true]);
        }

        if ($action === 'verify-otp' && $method === 'POST') {
            $code = $body['code'] ?? '';
            if (!$code) {
                sendJson(['error' => 'OTP code is required'], 400);
            }

            $otpId = $_SESSION['pendingOtpId'] ?? null;
            $pendingUserId = $_SESSION['pendingUserId'] ?? null;
            $pendingTenantId = $_SESSION['pendingTenantId'] ?? null;
            if (!$otpId || (!$pendingUserId && !$pendingTenantId)) {
                sendJson(['error' => 'No pending OTP session'], 400);
            }

            $otp = $storage->getLoginOtp($otpId);
            if (!$otp || (!empty($otp['used_at']))) {
                sendJson(['error' => 'OTP is invalid'], 400);
            }
            if (!empty($otp['expires_at']) && strtotime($otp['expires_at']) < time()) {
                sendJson(['error' => 'OTP expired'], 400);
            }
            if (!password_verify($code, $otp['code_hash'])) {
                sendJson(['error' => 'OTP is incorrect'], 401);
            }

            $storage->markLoginOtpUsed($otpId);
            unset($_SESSION['pendingOtpId']);

            if ($pendingUserId) {
                $user = $storage->getUser($pendingUserId);
                if (!$user) {
                    sendJson(['error' => 'User not found'], 404);
                }
                $storage->recordSuccessfulLogin($user['id']);
                $_SESSION['userId'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                unset($_SESSION['pendingUserId']);
                $mustChangePassword = false;
                if (isset($user['must_change_password'])) {
                    $mustChangePassword = $user['must_change_password'] == 1;
                }
                sendJson([
                    'success' => true,
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'role' => $user['role'] ?? 'landlord',
                        'mustChangePassword' => $mustChangePassword,
                        'propertyId' => $user['property_id'] ?? null,
                        'permissions' => $user['permissions'] ?? null
                    ]
                ]);
            }

            if ($pendingTenantId) {
                $_SESSION['tenantId'] = $pendingTenantId;
                unset($_SESSION['pendingTenantId']);
                $profile = $storage->getTenantPortalProfile($pendingTenantId);
                if (!$profile) {
                    sendJson(['error' => 'Tenant not found'], 404);
                }
                $storage->logActivity([
                    'action' => 'Tenant Portal Login',
                    'details' => "Tenant \"{$profile['full_name']}\" logged in to portal",
                    'type' => 'tenant',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $profile['property_id'] ?? null
                ]);
                sendJson([
                    'success' => true,
                    'tenant' => $profile
                ]);
            }
        }

        if ($action === 'resend-otp' && $method === 'POST') {
            $pendingUserId = $_SESSION['pendingUserId'] ?? null;
            $pendingTenantId = $_SESSION['pendingTenantId'] ?? null;
            if (!$pendingUserId && !$pendingTenantId) {
                sendJson(['error' => 'No pending OTP session'], 400);
            }

            if ($pendingUserId) {
                $user = $storage->getUser($pendingUserId);
                if (!$user) {
                    sendJson(['error' => 'User not found'], 404);
                }
                $otpResult = sendLoginOtp(
                    $storage,
                    $messagingService,
                    $user['id'],
                    null,
                    $user['full_name'] ?? $user['username'],
                    $user['username'],
                    $user['phone'] ?? null
                );
                if (!empty($otpResult['error'])) {
                    $status = isset($otpResult['retryAfter']) ? 429 : 500;
                    sendJson(['error' => $otpResult['error'], 'retryAfter' => $otpResult['retryAfter'] ?? null], $status);
                }
                $_SESSION['pendingOtpId'] = $otpResult['otpId'];
                sendJson(['success' => true, 'channels' => $otpResult['channels'], 'retryAfter' => 30]);
            }

            if ($pendingTenantId) {
                $tenant = $storage->getTenant($pendingTenantId);
                if (!$tenant) {
                    sendJson(['error' => 'Tenant not found'], 404);
                }
                $otpResult = sendLoginOtp(
                    $storage,
                    $messagingService,
                    null,
                    $tenant['id'],
                    $tenant['full_name'] ?? 'Tenant',
                    $tenant['email'] ?? null,
                    $tenant['phone'] ?? null
                );
                if (!empty($otpResult['error'])) {
                    $status = isset($otpResult['retryAfter']) ? 429 : 500;
                    sendJson(['error' => $otpResult['error'], 'retryAfter' => $otpResult['retryAfter'] ?? null], $status);
                }
                $_SESSION['pendingOtpId'] = $otpResult['otpId'];
                sendJson(['success' => true, 'channels' => $otpResult['channels'], 'retryAfter' => 30]);
            }
        }

        if ($action === 'tenant-check' && $method === 'GET') {
            $tenantId = $_SESSION['tenantId'] ?? null;
            if (!$tenantId) {
                sendJson(['error' => 'Not authenticated'], 401);
            }
            $profile = $storage->getTenantPortalProfile($tenantId);
            if (!$profile) {
                sendJson(['error' => 'Tenant not found'], 404);
            }
            sendJson([
                'success' => true,
                'tenant' => $profile
            ]);
        }

        if ($action === 'tenant-logout' && $method === 'POST') {
            unset($_SESSION['tenantId']);
            sendJson(['success' => true]);
        }
        
        if ($action === 'check' && $method === 'GET') {
            if (isset($_SESSION['userId'])) {
                $user = $storage->getUser($_SESSION['userId']);
                if ($user) {
                    // Ensure role is always returned (default to 'landlord' if missing)
                    $userRole = $user['role'] ?? 'landlord';
                    if (empty($user['role']) && (($_SESSION['loginType'] ?? null) === 'admin')) {
                        $userRole = 'admin';
                    }
                    
                    // Log warning if role is missing (shouldn't happen but helps debug)
                    if (empty($user['role'])) {
                        error_log("Warning: User {$user['id']} has no role in database - defaulting to 'landlord'");
                    }
                    
                    // Check if user must change password
                    $mustChangePassword = false;
                    if (isset($user['must_change_password'])) {
                        $mustChangePassword = $user['must_change_password'] == 1;
                    }
                    
                    sendJson([
                        'authenticated' => true, 
                        'user' => [
                            'id' => $user['id'], 
                            'username' => $user['username'],
                            'role' => $userRole,
                            'mustChangePassword' => $mustChangePassword,
                            'propertyId' => $user['property_id'] ?? null,
                            'permissions' => $user['permissions'] ?? null,
                            'propertyLimit' => $user['property_limit'] ?? null
                        ]
                    ]);
                } else {
                    // User ID in session but user not found in database - clear session
                    session_destroy();
                    sendJson(['authenticated' => false], 401);
                }
            } else {
                sendJson(['authenticated' => false], 401);
            }
        }
        
        if ($action === 'logout' && $method === 'POST') {
            unset($_SESSION['loginType']);
            session_destroy();
            sendJson(['success' => true]);
        }
        
        // Change password endpoint
        if ($action === 'change-password' && $method === 'POST') {
            if (!isset($_SESSION['userId'])) {
                sendJson(['error' => 'Not authenticated'], 401);
            }
            
            $currentPassword = $body['currentPassword'] ?? null;
            $newPassword = $body['newPassword'] ?? null;
            
            if (!$currentPassword || !$newPassword) {
                sendJson(['error' => 'Current password and new password are required'], 400);
            }
            
            if (strlen($newPassword) < 8) {
                sendJson(['error' => 'New password must be at least 8 characters'], 400);
            }
            
            $user = $storage->getUser($_SESSION['userId']);
            if (!$user) {
                sendJson(['error' => 'User not found'], 404);
            }
            
            // Verify current password
            $isValid = false;
            if (strpos($user['password'], '$2') === 0) {
                $isValid = password_verify($currentPassword, $user['password']);
            } else {
                $isValid = $user['password'] === $currentPassword;
            }
            
            if (!$isValid) {
                sendJson(['error' => 'Current password is incorrect'], 401);
            }
            
            // Update password and clear must_change_password flag
            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
            global $pdo;
            
            try {
                $stmt = $pdo->prepare("UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?");
                $stmt->execute([$hashedPassword, $_SESSION['userId']]);
            } catch (Exception $e) {
                // Fallback if must_change_password column doesn't exist
                $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                $stmt->execute([$hashedPassword, $_SESSION['userId']]);
            }
            
            sendJson(['success' => true, 'message' => 'Password changed successfully']);
        }
    }
    
    // ========== PROPERTIES ==========
    elseif ($endpoint === 'properties') {
        if ($method === 'GET' && !$id) {
            $landlordId = getQuery('landlordId');
            $propertyId = getQuery('propertyId');
            
            // Get current user role from session
            $userRole = null;
            $user = null;
            if (isset($_SESSION['userId'])) {
                $user = $storage->getUser($_SESSION['userId']);
                $userRole = $user['role'] ?? 'landlord';
            }
            
            // Admin and super_admin users can see all properties, but honor filters when provided
            if ($userRole === 'admin' || $userRole === 'super_admin') {
                if ($landlordId || $propertyId) {
                    sendJson($storage->getAllProperties($landlordId, $propertyId));
                } else {
                    sendJson($storage->getAllProperties());
                }
            } elseif (isLandlordRole($userRole)) {
                if (!$user) {
                    sendJson(['error' => 'Unauthorized'], 401);
                }
                // Landlords see all their properties
                $landlordId = $user['id'] ?? null;
                sendJson($storage->getAllProperties($landlordId, null));
            } else {
                if (!$user) {
                    sendJson(['error' => 'Unauthorized'], 401);
                }
                // System users: only assigned properties
                $propertyIds = $storage->getUserPropertyIds($user['id']);
                sendJson($storage->getPropertiesByIds($propertyIds));
            }
        }
        
        if ($method === 'GET' && $id) {
            if ($action === 'disable' && $method === 'POST') {
                $property = $storage->disableProperty($id);
                if ($property) {
                    $storage->logActivity([
                        'action' => 'Property Disabled',
                        'details' => "Property \"{$property['name']}\" disabled",
                        'type' => 'property',
                        'status' => 'warning',
                        'userId' => $_SESSION['userId'] ?? null,
                        'propertyId' => $property['id'] ?? $id
                    ]);
                }
                sendJson($property ?: ['error' => 'Property not found'], $property ? 200 : 404);
            }
            if ($action === 'enable' && $method === 'POST') {
                $property = $storage->enableProperty($id);
                if ($property) {
                    $storage->logActivity([
                        'action' => 'Property Enabled',
                        'details' => "Property \"{$property['name']}\" enabled",
                        'type' => 'property',
                        'status' => 'success',
                        'userId' => $_SESSION['userId'] ?? null,
                        'propertyId' => $property['id'] ?? $id
                    ]);
                }
                sendJson($property ?: ['error' => 'Property not found'], $property ? 200 : 404);
            }
            $property = $storage->getProperty($id);
            if (!$property) {
                sendJson([
                    'error' => 'Property not found',
                    'message' => 'The property may have been deleted or does not exist. Please refresh the page.'
                ], 404);
            } else {
                // Restrict non-admin users to their allowed scope
                $userRole = null;
                $user = null;
                if (isset($_SESSION['userId'])) {
                    $user = $storage->getUser($_SESSION['userId']);
                    $userRole = $user['role'] ?? 'landlord';
                }
                if ($userRole !== 'admin' && $userRole !== 'super_admin') {
                    if (!$user) {
                        sendJson(['error' => 'Unauthorized'], 401);
                    }
                    if (isLandlordRole($userRole)) {
                        $landlordId = $user['id'] ?? null;
                        $ownsLandlord = isset($property['landlord_id']) && (string)$property['landlord_id'] === (string)$landlordId;
                        if (!$ownsLandlord && $landlordId) {
                            $landlord = $storage->getUser($landlordId);
                            $ownsLandlord = $landlord && isset($property['landlord_email']) && $property['landlord_email'] === $landlord['username'];
                        }
                        if (!$ownsLandlord) {
                            sendJson(['error' => 'Forbidden'], 403);
                        }
                    } else {
                        $propertyIds = $storage->getUserPropertyIds($user['id']);
                        if (!in_array($property['id'], $propertyIds, false)) {
                            sendJson(['error' => 'Forbidden'], 403);
                        }
                    }
                }
                sendJson($property, 200);
            }
        }
        
        if ($method === 'POST') {
            $userId = $_SESSION['userId'] ?? null;
            if (!$userId) {
                sendJson(['error' => 'Unauthorized'], 401);
            }
            $user = $storage->getUser($userId);
            $userRole = $user['role'] ?? 'landlord';
            $permissions = parsePermissions($user['permissions'] ?? null);
            $canCreateProperty =
                $userRole === 'admin' ||
                $userRole === 'super_admin' ||
                in_array('properties.create', $permissions, true) ||
                hasPermissionCategory($permissions, 'properties');
            if (!$canCreateProperty) {
                sendJson(['error' => 'You do not have permission to create properties.'], 403);
            }
            try {
                $property = $storage->createProperty($body);
                $storage->logActivity([
                    'action' => 'Property Created',
                    'details' => "Property \"{$property['name']}\" created",
                    'type' => 'property',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $property['id'] ?? null
                ]);
                sendJson($property, 201);
            } catch (Exception $e) {
                sendJson(['error' => $e->getMessage()], 400);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $property = $storage->updateProperty($id, $body);
            if ($property) {
                $storage->logActivity([
                    'action' => 'Property Updated',
                    'details' => "Property \"{$property['name']}\" updated",
                    'type' => 'property',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $property['id'] ?? null
                ]);
            }
            sendJson($property ?: ['error' => 'Property not found'], $property ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteProperty($id);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Property Deleted',
                    'details' => "Property deleted",
                    'type' => 'property',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $id
                ]);
            }
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== LANDLORDS ==========
    elseif ($endpoint === 'landlords') {
        // Check actions first (these may use different HTTP methods)
        if ($id && $action === 'send-login-details' && $method === 'POST') {
            global $messagingService;
            
            // Handle send login details
            $generateNew = $body['generateNewPassword'] ?? false;
            $result = $storage->sendLandlordLoginDetails($id, $generateNew);
            
            // Get landlord details for sending
            $landlord = $storage->getLandlord($id);
            if (!$landlord) {
                sendJson(['error' => 'Landlord not found'], 404);
            }
            
            // Get phone from user first, fallback to property landlord_phone
            $landlordPhone = $landlord['phone'] ?? null;
            if (!$landlordPhone) {
                $properties = $storage->getAllProperties($id);
                if (!empty($properties)) {
                    $landlordPhone = $properties[0]['landlord_phone'] ?? null;
                }
            }
            
            // Prepare message content
            $username = $landlord['username'];
            $fullName = $landlord['full_name'] ?? $landlord['fullName'] ?? $username;
            $password = $result['password'] ?? null;
            $passwordLine = $password ? $password : 'Use your existing password';

            // Build SMS message
            $smsMessage = "Greetings {$fullName}, your LeaseMaster Portal access is ready. Your credentials are as follows:\n";
            $smsMessage .= "Portal: https://portal.theleasemaster.com\n";
            $smsMessage .= "Username: {$username}\n";
            $smsMessage .= "Password: {$passwordLine}\n";
            $smsMessage .= "(do not share this message with anyone)";
            
            // Build Email message
            $emailSubject = "LeaseMaster Portal Login Details";
            $emailBody = "<html><body>";
            $emailBody .= "<p>Greetings " . htmlspecialchars($fullName) . ", your LeaseMaster Portal access is ready. Your credentials are as follows:</p>";
            $emailBody .= "<p><strong>Username:</strong> {$username}<br/>";
            $emailBody .= "<strong>Password:</strong> {$passwordLine}<br/>";
            $emailBody .= "(do not share this message with anyone)</p>";
            $emailBody .= "<p>Sign in here:<br/><a href='https://portal.theleasemaster.com'>https://portal.theleasemaster.com</a></p>";
            $emailBody .= "<p>Warm Regards,<br/>LeaseMaster Management.</p>";
            $emailBody .= "</body></html>";
            
            $sendResults = ['sms' => null, 'email' => null];
            
            $sentByUserId = $_SESSION['userId'] ?? null;
            $senderShortcode = getenv('SYSTEM_SMS_SHORTCODE') ?: 'AdvantaSMS';

            // Send SMS if phone available
            if ($landlordPhone) {
                $smsResult = $messagingService->sendSystemSMS($landlordPhone, $smsMessage);
                $sendResults['sms'] = $smsResult;
                
                // Log SMS to outbox
                $messagingService->logMessage([
                    'channel' => 'sms',
                    'recipientContact' => $landlordPhone,
                    'status' => $smsResult['success'] ? 'sent' : 'failed',
                    'messageCategory' => 'login_credentials',
                    'recipientType' => 'landlord',
                    'recipientName' => $username,
                    'content' => $smsMessage,
                    'tenantId' => null,
                    'externalMessageId' => $smsResult['messageId'] ?? null,
                    'senderShortcode' => $senderShortcode,
                    'sentByUserId' => $sentByUserId
                ]);
            
                $storage->logActivity([
                    'action' => 'SMS Sent',
                    'details' => 'Login credentials SMS sent to landlord',
                    'type' => 'messaging',
                    'status' => $smsResult['success'] ? 'success' : 'error',
                    'userId' => $sentByUserId
                ]);
            }
            
            // Send Email (username is the email)
            $emailResult = $messagingService->sendEmail($username, null, $emailSubject, $emailBody);
            $sendResults['email'] = $emailResult;
            
            // Log Email to outbox
            $messagingService->logMessage([
                'channel' => 'email',
                'recipientContact' => $username,
                'status' => $emailResult['success'] ? 'sent' : 'failed',
                'messageCategory' => 'login_credentials',
                'recipientType' => 'landlord',
                'recipientName' => $username,
                'subject' => $emailSubject,
                'content' => $emailBody,
                'tenantId' => null,
                'externalMessageId' => $emailResult['messageId'] ?? null,
                'sentByUserId' => $sentByUserId
            ]);
            
            $storage->logActivity([
                'action' => 'Email Sent',
                'details' => 'Login credentials email sent to landlord',
                'type' => 'messaging',
                'status' => $emailResult['success'] ? 'success' : 'error',
                'userId' => $sentByUserId
            ]);
            
            // Set must_change_password if new password was generated
            if ($isNewPassword) {
                try {
                    global $pdo;
                    $stmt = $pdo->prepare("UPDATE users SET must_change_password = 1 WHERE id = ?");
                    $stmt->execute([$id]);
                } catch (Exception $e) {
                    // Column might not exist yet, ignore
                    error_log("Could not set must_change_password: " . $e->getMessage());
                }
            }
            
            sendJson([
                'success' => true,
                'message' => $isNewPassword ? 'New login credentials generated and sent' : 'Login reminder sent',
                'sendResults' => $sendResults
            ], 200);
        }
        
        if ($id && $action === 'unblock' && $method === 'POST') {
            $storage->unblockUser($id);
            $user = $storage->getUser($id);
            sendJson(['success' => true, 'user' => $user], 200);
        }
        
        // Standard CRUD operations
        if ($method === 'GET' && !$id) {
            $currentUser = $storage->getUser($_SESSION['userId'] ?? null);
            $currentRole = $currentUser['role'] ?? 'landlord';
            $adminId = null;
            if ($currentRole === 'admin') {
                $adminId = $currentUser['id'] ?? null;
            }
            sendJson($storage->getLandlords($adminId));
        }
        
        if ($method === 'GET' && $id && !$action) {
            $landlord = $storage->getLandlord($id);
            sendJson($landlord ?: ['error' => 'Landlord not found'], $landlord ? 200 : 404);
        }
        
        if ($method === 'POST' && !$id) {
            $userId = $_SESSION['userId'] ?? null;
            if (!$userId) {
                sendJson(['error' => 'Unauthorized'], 401);
            }
            $user = $storage->getUser($userId);
            $userRole = $user['role'] ?? 'landlord';
            $permissions = parsePermissions($user['permissions'] ?? null);
            $canCreateLandlord =
                $userRole === 'admin' ||
                $userRole === 'super_admin' ||
                in_array('landlords.create', $permissions, true) ||
                hasPermissionCategory($permissions, 'landlords');
            if (!$canCreateLandlord) {
                sendJson(['error' => 'You do not have permission to create landlords.'], 403);
            }
            try {
                $body['adminId'] = $userId;
                $landlord = $storage->createLandlord($body);
                // Verify landlord was actually created in database
                $verifyLandlord = $storage->getLandlord($landlord['id']);
                if (!$verifyLandlord) {
                    throw new Exception('Landlord creation failed - user not found in database after creation');
                }
                $storage->logActivity([
                    'action' => 'Landlord Created',
                    'details' => "Landlord \"{$landlord['username']}\" created",
                    'type' => 'user',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
                sendJson($landlord, 201);
            } catch (Exception $e) {
                sendJson(['error' => $e->getMessage()], 400);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $landlord = $storage->updateLandlord($id, $body);
            if ($landlord) {
                $storage->logActivity([
                    'action' => 'Landlord Updated',
                    'details' => "Landlord \"{$landlord['username']}\" updated",
                    'type' => 'user',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
            }
            sendJson($landlord ?: ['error' => 'Landlord not found'], $landlord ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $landlord = $storage->getLandlord($id);
            $success = $storage->deleteLandlord($id);
            sendJson([], $success ? 204 : 404);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Landlord Deleted',
                    'details' => $landlord ? "Landlord \"{$landlord['username']}\" deleted" : 'Landlord deleted',
                    'type' => 'user',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
            }
        }
    }
    
    // ========== HOUSE TYPES ==========
    elseif ($endpoint === 'house-types') {
        if ($method === 'GET' && !$id) {
            $propertyId = getQuery('propertyId');
            $landlordId = getQuery('landlordId');
            if ($propertyId) {
                $houseTypes = $storage->getHouseTypesByProperty($propertyId);
            } elseif ($landlordId) {
                $houseTypes = $storage->getHouseTypesByLandlord($landlordId);
            } else {
                $houseTypes = $storage->getAllHouseTypes();
            }
            sendJson(array_values($houseTypes));
        }
        
        if ($method === 'GET' && $id) {
            $houseType = $storage->getHouseType($id);
            sendJson($houseType ?: ['error' => 'House type not found'], $houseType ? 200 : 404);
        }
        
        if ($method === 'POST') {
            try {
                if (empty($body['propertyId'])) {
                    sendJson(['error' => 'propertyId is required'], 400);
                }
                $houseType = $storage->createHouseType($body);
                if ($houseType) {
                    $storage->logActivity([
                        'action' => 'House Type Created',
                        'details' => "House type \"{$houseType['name']}\" created",
                        'type' => 'house_type',
                        'status' => 'success',
                        'userId' => $_SESSION['userId'] ?? null,
                        'propertyId' => $houseType['property_id'] ?? null
                    ]);
                }
                sendJson($houseType, 201);
            } catch (Exception $e) {
                error_log("House type create failed: " . $e->getMessage());
                sendJson(['error' => $e->getMessage()], 400);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $houseType = $storage->updateHouseType($id, $body);
            if ($houseType) {
                $storage->logActivity([
                    'action' => 'House Type Updated',
                    'details' => "House type \"{$houseType['name']}\" updated",
                    'type' => 'house_type',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $houseType['property_id'] ?? null
                ]);
            }
            sendJson($houseType ?: ['error' => 'House type not found'], $houseType ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $houseType = $storage->getHouseType($id);
            $success = $storage->deleteHouseType($id);
            sendJson([], $success ? 204 : 404);
            if ($success) {
                $storage->logActivity([
                    'action' => 'House Type Deleted',
                    'details' => $houseType ? "House type \"{$houseType['name']}\" deleted" : 'House type deleted',
                    'type' => 'house_type',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $houseType['property_id'] ?? null
                ]);
            }
        }
    }
    
    // ========== UNITS ==========
    elseif ($endpoint === 'units') {
        if ($method === 'GET' && !$id) {
            $propertyId = getQuery('propertyId');
            $landlordId = getQuery('landlordId');
            if ($propertyId && $landlordId) {
                sendJson($storage->getUnitsByLandlordAndProperty($landlordId, $propertyId));
            } elseif ($propertyId) {
                sendJson($storage->getUnitsByProperty($propertyId));
            } elseif ($landlordId) {
                sendJson($storage->getUnitsByLandlord($landlordId));
            } else {
                sendJson($storage->getAllUnits());
            }
        }
        
        if ($method === 'GET' && $id) {
            $unit = $storage->getUnit($id);
            sendJson($unit ?: ['error' => 'Unit not found'], $unit ? 200 : 404);
        }
        
        if ($method === 'POST') {
            if ($action === 'bulk-delete') {
                $unitIds = $body['unitIds'] ?? [];
                $success = [];
                $failed = [];
                foreach ($unitIds as $unitId) {
                    try {
                        $storage->deleteUnit($unitId);
                        $success[] = $unitId;
                    } catch (Exception $e) {
                        $failed[] = ['id' => $unitId, 'error' => $e->getMessage()];
                    }
                }
                if (!empty($success)) {
                    $storage->logActivity([
                        'action' => 'Units Deleted',
                        'details' => 'Bulk delete of ' . count($success) . ' unit(s)',
                        'type' => 'unit',
                        'status' => 'warning',
                        'userId' => $_SESSION['userId'] ?? null
                    ]);
                }
                sendJson(['success' => $success, 'failed' => $failed]);
            } else {
                $unit = $storage->createUnit($body);
                if ($unit) {
                    $storage->logActivity([
                        'action' => 'Unit Created',
                        'details' => "Unit \"{$unit['unit_number']}\" created",
                        'type' => 'unit',
                        'status' => 'success',
                        'userId' => $_SESSION['userId'] ?? null,
                        'propertyId' => $unit['property_id'] ?? null
                    ]);
                }
                sendJson($unit, 201);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $unit = $storage->updateUnit($id, $body);
            if ($unit) {
                $storage->logActivity([
                    'action' => 'Unit Updated',
                    'details' => "Unit \"{$unit['unit_number']}\" updated",
                    'type' => 'unit',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $unit['property_id'] ?? null
                ]);
            }
            sendJson($unit ?: ['error' => 'Unit not found'], $unit ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $unit = $storage->getUnit($id);
            $success = $storage->deleteUnit($id);
            sendJson([], $success ? 204 : 404);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Unit Deleted',
                    'details' => $unit ? "Unit \"{$unit['unit_number']}\" deleted" : 'Unit deleted',
                    'type' => 'unit',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $unit['property_id'] ?? null
                ]);
            }
        }
    }
    
    // ========== TENANTS ==========
    elseif ($endpoint === 'tenants') {
        if ($id && $action === 'send-login-details' && $method === 'POST') {
            $result = sendTenantLoginDetails($storage, $messagingService, $id, [
                'generateNew' => $body['generateNewAccessCode'] ?? true,
                'sendSms' => $body['sendSms'] ?? true,
                'sendEmail' => $body['sendEmail'] ?? true,
            ]);

            if (!empty($result['error'])) {
                sendJson(['error' => $result['error']], 400);
            }

            $channels = [];
            if (isset($result['sent']['sms'])) $channels[] = 'SMS';
            if (isset($result['sent']['email'])) $channels[] = 'Email';
            $channelLabel = empty($channels) ? 'no channels' : implode(' & ', $channels);

            $storage->logActivity([
                'action' => 'Tenant Login Details Sent',
                'details' => "Tenant \"{$result['tenant']['full_name']}\" login sent via {$channelLabel}",
                'type' => 'tenant',
                'status' => $result['success'] ? 'success' : 'warning',
                'userId' => $_SESSION['userId'] ?? null,
                'propertyId' => $result['profile']['property_id'] ?? null
            ]);

            sendJson([
                'success' => $result['success'],
                'accessCode' => $result['accessCode'],
                'sent' => $result['sent']
            ]);
        }

        if ($id === 'bulk-send-login-details' && $method === 'POST') {
            $tenantIds = $body['tenantIds'] ?? [];
            if (!is_array($tenantIds) || empty($tenantIds)) {
                sendJson(['error' => 'tenantIds array is required'], 400);
            }

            $results = [];
            $successCount = 0;
            $failCount = 0;

            foreach ($tenantIds as $tenantId) {
                $result = sendTenantLoginDetails($storage, $messagingService, $tenantId, [
                    'generateNew' => $body['generateNewAccessCode'] ?? true,
                    'sendSms' => $body['sendSms'] ?? true,
                    'sendEmail' => $body['sendEmail'] ?? true,
                ]);

                if ($result['success']) {
                    $successCount++;
                } else {
                    $failCount++;
                }

                $tenantName = $result['tenant']['full_name'] ?? $tenantId;
                $channels = [];
                if (isset($result['sent']['sms'])) $channels[] = 'SMS';
                if (isset($result['sent']['email'])) $channels[] = 'Email';
                $channelLabel = empty($channels) ? 'no channels' : implode(' & ', $channels);

                $storage->logActivity([
                    'action' => 'Tenant Login Details Sent',
                    'details' => "Tenant \"{$tenantName}\" login sent via {$channelLabel}",
                    'type' => 'tenant',
                    'status' => $result['success'] ? 'success' : 'warning',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $result['profile']['property_id'] ?? null
                ]);

                $results[] = [
                    'tenantId' => $tenantId,
                    'success' => $result['success'],
                    'error' => $result['error'] ?? null
                ];
            }

            sendJson([
                'success' => $failCount === 0,
                'sent' => $successCount,
                'failed' => $failCount,
                'results' => $results
            ]);
        }

        if ($method === 'GET' && !$id) {
            $propertyId = getQuery('propertyId');
            $landlordId = getQuery('landlordId');
            $userRole = null;
            $user = null;
            if (isset($_SESSION['userId'])) {
                $user = $storage->getUser($_SESSION['userId']);
                $userRole = $user['role'] ?? 'landlord';
            }

            if ($userRole === 'admin' || $userRole === 'super_admin') {
                if ($propertyId && $landlordId) {
                    sendJson($storage->getTenantsByLandlordAndProperty($landlordId, $propertyId));
                } elseif ($propertyId) {
                    sendJson($storage->getTenantsByProperty($propertyId));
                } elseif ($landlordId) {
                    sendJson($storage->getTenantsByLandlord($landlordId));
                } else {
                    sendJson($storage->getAllTenants());
                }
            } else {
                if (!$user) {
                    sendJson(['error' => 'Unauthorized'], 401);
                }
                if (isLandlordRole($userRole)) {
                    $landlordId = $user['id'] ?? null;
                    sendJson($storage->getTenantsByLandlord($landlordId));
                } else {
                    $propertyIds = $storage->getUserPropertyIds($user['id']);
                    sendJson($storage->getTenantsByPropertyIds($propertyIds));
                }
            }
        }
        
        if ($method === 'GET' && $id) {
            $tenant = $storage->getTenant($id);
            sendJson($tenant ?: ['error' => 'Tenant not found'], $tenant ? 200 : 404);
        }
        
        if ($method === 'POST') {
            try {
                $tenant = $storage->createTenant($body);
                $storage->logActivity([
                    'action' => 'Tenant Created',
                    'details' => "Tenant \"{$tenant['full_name']}\" created",
                    'type' => 'tenant',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
                sendJson($tenant, 201);
            } catch (Exception $e) {
                error_log("Tenant create failed: " . $e->getMessage());
                sendJson(['error' => $e->getMessage()], 400);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $tenant = $storage->updateTenant($id, $body);
            if ($tenant) {
                $storage->logActivity([
                    'action' => 'Tenant Updated',
                    'details' => "Tenant \"{$tenant['full_name']}\" updated",
                    'type' => 'tenant',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
            }
            sendJson($tenant ?: ['error' => 'Tenant not found'], $tenant ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteTenant($id);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Tenant Deleted',
                    'details' => "Tenant deleted",
                    'type' => 'tenant',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
            }
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== LEASES ==========
    elseif ($endpoint === 'leases') {
        if ($method === 'GET' && !$id) {
            $tenantId = getQuery('tenantId');
            $unitId = getQuery('unitId');
            $active = getQuery('active');
            
            if ($tenantId) {
                sendJson($storage->getLeasesByTenant($tenantId));
            } elseif ($unitId) {
                sendJson($storage->getLeasesByUnit($unitId));
            } elseif ($active === 'true') {
                sendJson($storage->getActiveLeases());
            } else {
                sendJson($storage->getAllLeases());
            }
        }
        
        if ($method === 'GET' && $id) {
            if ($action === 'balance') {
                $balance = $storage->calculateLeaseBalance($id);
                sendJson(['leaseId' => $id, 'balance' => $balance]);
            } else {
                $lease = $storage->getLease($id);
                sendJson($lease ?: ['error' => 'Lease not found'], $lease ? 200 : 404);
            }
        }
        
        if ($method === 'POST') {
            $lease = $storage->createLease($body);
            if ($lease) {
                $unit = $storage->getUnit($lease['unit_id'] ?? null);
                $storage->logActivity([
                    'action' => 'Lease Created',
                    'details' => "Lease created for unit \"{$unit['unit_number']}\"",
                    'type' => 'lease',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $unit['property_id'] ?? null
                ]);
            }
            sendJson($lease, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $lease = $storage->updateLease($id, $body);
            if ($lease) {
                $unit = $storage->getUnit($lease['unit_id'] ?? null);
                $storage->logActivity([
                    'action' => 'Lease Updated',
                    'details' => "Lease updated for unit \"{$unit['unit_number']}\"",
                    'type' => 'lease',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $unit['property_id'] ?? null
                ]);
            }
            sendJson($lease ?: ['error' => 'Lease not found'], $lease ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $lease = $storage->getLease($id);
            $unit = $lease ? $storage->getUnit($lease['unit_id'] ?? null) : null;
            $success = $storage->deleteLease($id);
            sendJson([], $success ? 204 : 404);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Lease Deleted',
                    'details' => $unit ? "Lease deleted for unit \"{$unit['unit_number']}\"" : 'Lease deleted',
                    'type' => 'lease',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $unit['property_id'] ?? null
                ]);
            }
        }
    }
    
    // ========== INVOICES ==========
    elseif ($endpoint === 'invoices') {
        if ($method === 'GET' && !$id) {
            $leaseId = getQuery('leaseId');
            $overdue = getQuery('overdue');
            
            if ($leaseId) {
                sendJson($storage->getInvoicesByLease($leaseId));
            } elseif ($overdue === 'true') {
                sendJson($storage->getOverdueInvoices());
            } else {
                sendJson($storage->getAllInvoices());
            }
        }
        
        if ($method === 'GET' && $id) {
            if ($action === 'items') {
                sendJson($storage->getInvoiceItemsByInvoice($id));
            } else {
                $invoice = $storage->getInvoice($id);
                sendJson($invoice ?: ['error' => 'Invoice not found'], $invoice ? 200 : 404);
            }
        }
        
        if ($method === 'POST') {
            if ($action === 'generate') {
                $month = $body['month'] ?? date('n');
                $year = $body['year'] ?? date('Y');
                $invoices = $storage->generateMonthlyInvoices($month, $year);
                $storage->logActivity([
                    'action' => 'Invoices Generated',
                    'details' => "Generated " . count($invoices) . " invoices for {$month}/{$year}",
                    'type' => 'invoice',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
                sendJson(['message' => "Generated " . count($invoices) . " invoices for $month/$year", 'invoices' => $invoices]);
            } else {
                $invoice = $storage->createInvoice($body);
                $propertyId = getPropertyIdByLease($storage, $body['leaseId'] ?? null);
                $storage->logActivity([
                    'action' => 'Invoice Created',
                    'details' => "Invoice {$invoice['invoice_number']} created",
                    'type' => 'invoice',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $propertyId
                ]);
                sendJson($invoice, 201);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $existingInvoice = $storage->getInvoice($id);
            $invoice = $storage->updateInvoice($id, $body);
            if ($invoice) {
                $propertyId = getPropertyIdByLease($storage, $invoice['lease_id'] ?? null);
                $actionLabel = 'Invoice Updated';
                if (isset($body['status']) && $existingInvoice && $body['status'] !== $existingInvoice['status']) {
                    $status = strtolower($body['status']);
                    if ($status === 'approved') {
                        $actionLabel = 'Invoice Approved';
                    } elseif ($status === 'sent') {
                        $actionLabel = 'Invoice Sent';
                    } elseif ($status === 'paid') {
                        $actionLabel = 'Invoice Paid';
                    }
                }
                $storage->logActivity([
                    'action' => $actionLabel,
                    'details' => "Invoice {$invoice['invoice_number']} updated",
                    'type' => 'invoice',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $propertyId
                ]);
            }
            sendJson($invoice ?: ['error' => 'Invoice not found'], $invoice ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteInvoice($id);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Invoice Deleted',
                    'details' => "Invoice deleted",
                    'type' => 'invoice',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
            }
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== PAYMENTS ==========
    elseif ($endpoint === 'payments') {
        if ($method === 'GET' && !$id) {
            $leaseId = getQuery('leaseId');
            $invoiceId = getQuery('invoiceId');
            
            if ($leaseId) {
                sendJson($storage->getPaymentsByLease($leaseId));
            } elseif ($invoiceId) {
                sendJson($storage->getPaymentsByInvoice($invoiceId));
            } else {
                sendJson($storage->getAllPayments());
            }
        }
        
        if ($method === 'GET' && $id) {
            $payment = $storage->getPayment($id);
            sendJson($payment ?: ['error' => 'Payment not found'], $payment ? 200 : 404);
        }
        
        if ($method === 'POST') {
            $payment = $storage->createPayment($body);
            $propertyId = getPropertyIdByLease($storage, $body['leaseId'] ?? null);
            $lease = $storage->getLease($body['leaseId'] ?? null);
            $tenantId = $lease['tenant_id'] ?? null;
            $storage->logActivity([
                'action' => 'Payment Received',
                'details' => "Payment of KSh {$body['amount']} received",
                'type' => 'payment',
                'status' => 'success',
                'userId' => $_SESSION['userId'] ?? null,
                'propertyId' => $propertyId
            ]);
            if ($tenantId) {
                sendTenantPaymentConfirmation($storage, $messagingService, $propertyId, $tenantId, $body['amount']);
            }
            sendJson($payment, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $payment = $storage->updatePayment($id, $body);
            if ($payment) {
                $propertyId = getPropertyIdByLease($storage, $payment['lease_id'] ?? null);
                $storage->logActivity([
                    'action' => 'Payment Updated',
                    'details' => "Payment of KSh {$payment['amount']} updated",
                    'type' => 'payment',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $propertyId
                ]);
            }
            sendJson($payment ?: ['error' => 'Payment not found'], $payment ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deletePayment($id);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Payment Deleted',
                    'details' => "Payment deleted",
                    'type' => 'payment',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
            }
            sendJson([], $success ? 204 : 404);
        }
    }

    // ========== SETTINGS ==========
    elseif ($endpoint === 'settings') {
        requireAuth();
        $scopePropertyId = getQuery('propertyId') ?? ($body['propertyId'] ?? null);
        $scopeLandlordId = getQuery('landlordId') ?? ($body['landlordId'] ?? $_SESSION['userId'] ?? null);
        $section = $action ?? $id;

        if ($section === 'invoice-logo' && $method === 'POST') {
            try {
                if (!$scopePropertyId) {
                    sendJson(['error' => 'propertyId is required'], 400);
                }
                if (!isset($_FILES['logo'])) {
                    sendJson(['error' => 'Logo file is required'], 400);
                }
                $file = $_FILES['logo'];
                if (!empty($file['error'])) {
                    sendJson(['error' => 'Failed to upload logo', 'code' => $file['error']], 400);
                }
                if ($file['size'] > 5 * 1024 * 1024) {
                    sendJson(['error' => 'Logo exceeds 5MB limit'], 400);
                }
                if (!is_uploaded_file($file['tmp_name'])) {
                    sendJson(['error' => 'Invalid upload'], 400);
                }
                $imageInfo = @getimagesize($file['tmp_name']);
                $mimeType = $imageInfo['mime'] ?? null;
                if (!$mimeType && !empty($file['type'])) {
                    $mimeType = $file['type'];
                }
                $allowedTypes = ['image/png', 'image/jpeg'];
                if (!in_array($mimeType, $allowedTypes, true)) {
                    sendJson(['error' => 'Only PNG or JPEG logos are allowed'], 400);
                }
                $extension = $mimeType === 'image/png' ? 'png' : 'jpg';
                $publicRoot = realpath(__DIR__ . '/../public') ?: (__DIR__ . '/../public');
                $uploadDir = $publicRoot . '/uploads/invoice-logos';
                if (!is_dir($uploadDir) && !mkdir($uploadDir, 0777, true)) {
                    sendJson(['error' => 'Failed to create logo directory'], 500);
                }
                $existingSettings = $storage->getInvoiceSettings($scopePropertyId, $scopeLandlordId);
                if (!empty($existingSettings['logo_url'])) {
                    $existingPath = $publicRoot . $existingSettings['logo_url'];
                    if (file_exists($existingPath)) {
                        unlink($existingPath);
                    }
                }
                $fileName = $scopePropertyId . '-' . time() . '.' . $extension;
                $destination = $uploadDir . '/' . $fileName;
                if (!move_uploaded_file($file['tmp_name'], $destination)) {
                    sendJson(['error' => 'Failed to save logo'], 500);
                }
                $logoUrl = '/uploads/invoice-logos/' . $fileName;
                $storage->saveInvoiceSettings($scopePropertyId, $scopeLandlordId, [
                    'logo_url' => $logoUrl
                ]);
                sendJson(['logo_url' => $logoUrl], 200);
            } catch (Exception $e) {
                sendJson(['error' => 'Logo upload failed', 'message' => $e->getMessage()], 500);
            }
        }
        if ($section === 'invoice-logo' && $method === 'DELETE') {
            if (!$scopePropertyId) {
                sendJson(['error' => 'propertyId is required'], 400);
            }
            $existingSettings = $storage->getInvoiceSettings($scopePropertyId, $scopeLandlordId);
            if (!empty($existingSettings['logo_url'])) {
                $existingPath = __DIR__ . '/../public' . $existingSettings['logo_url'];
                if (file_exists($existingPath)) {
                    unlink($existingPath);
                }
            }
            $storage->saveInvoiceSettings($scopePropertyId, $scopeLandlordId, [
                'logo_url' => ''
            ]);
            sendJson(['logo_url' => ''], 200);
        }

        if ($section === 'sms') {
            if ($method === 'GET') {
                sendJson($storage->getSmsSettings($scopePropertyId, $scopeLandlordId) ?: []);
            }
            if ($method === 'PUT' || $method === 'POST') {
                $data = $body;
                $settings = $storage->saveSmsSettings($scopePropertyId, $scopeLandlordId, $data);
                sendJson($settings);
            }
        }
        if ($section === 'email') {
            if ($method === 'GET') {
                sendJson($storage->getEmailSettings($scopePropertyId, $scopeLandlordId) ?: []);
            }
            if ($method === 'PUT' || $method === 'POST') {
                $data = $body;
                $settings = $storage->saveEmailSettings($scopePropertyId, $scopeLandlordId, $data);
                sendJson($settings);
            }
        }
        if ($section === 'mpesa') {
            if ($method === 'GET') {
                sendJson($storage->getMpesaSettings($scopePropertyId, $scopeLandlordId) ?: []);
            }
            if ($method === 'PUT' || $method === 'POST') {
                $data = $body;
                $settings = $storage->saveMpesaSettings($scopePropertyId, $scopeLandlordId, $data);
                sendJson($settings);
            }
        }
        if ($section === 'invoice') {
            if ($method === 'GET') {
                sendJson($storage->getInvoiceSettings($scopePropertyId, $scopeLandlordId) ?: []);
            }
            if ($method === 'PUT' || $method === 'POST') {
                $data = $body;
                $settings = $storage->saveInvoiceSettings($scopePropertyId, $scopeLandlordId, $data);
                sendJson($settings);
            }
        }
        if ($section === 'alerts') {
            if ($method === 'GET') {
                sendJson($storage->getAlertSettings($scopePropertyId, $scopeLandlordId));
            }
            if ($method === 'PUT' || $method === 'POST') {
                $alerts = $body['alerts'] ?? [];
                $settings = $storage->saveAlertSettings($scopePropertyId, $scopeLandlordId, $alerts);
                sendJson($settings);
            }
        }
    }

    // ========== M-PESA STK PUSH ==========
    elseif ($endpoint === 'mpesa' && $action === 'stk-push' && $method === 'POST') {
        if (!isset($_SESSION['userId']) && !isset($_SESSION['tenantId'])) {
            sendJson(['error' => 'Unauthorized'], 401);
        }

        $invoiceId = $body['invoiceId'] ?? null;
        $amount = $body['amount'] ?? null;
        $phone = $body['phone'] ?? null;
        if (!$invoiceId || !$amount || !$phone) {
            sendJson(['error' => 'invoiceId, amount, and phone are required'], 400);
        }

        $invoice = $storage->getInvoice($invoiceId);
        if (!$invoice) {
            sendJson(['error' => 'Invoice not found'], 404);
        }

        $lease = $storage->getLease($invoice['lease_id'] ?? null);
        $unit = $storage->getUnit($lease['unit_id'] ?? null);
        $property = $storage->getProperty($unit['property_id'] ?? null);
        $tenantId = $lease['tenant_id'] ?? null;

        $propertyId = $property['id'] ?? null;
        $landlordId = $property['landlord_id'] ?? null;
        $settings = $storage->getMpesaSettings($propertyId, $landlordId);
        if (!$settings || empty($settings['enabled'])) {
            sendJson(['error' => 'M-Pesa STK is not enabled for this property'], 400);
        }

        $accountNumber = buildTenantAccountNumber($property['account_prefix'] ?? '', $unit['unit_number'] ?? '');
        if (!$accountNumber) {
            sendJson(['error' => 'Account number is missing. Set property prefix and unit number.'], 400);
        }

        $response = sendMpesaStkPush($settings, [
            'amount' => $amount,
            'phone' => $phone,
            'accountNumber' => $accountNumber,
            'description' => "Invoice {$invoice['invoice_number']}"
        ]);

        $storage->createMpesaStkRequest([
            'landlordId' => $landlordId,
            'propertyId' => $propertyId,
            'tenantId' => $tenantId,
            'invoiceId' => $invoiceId,
            'phone' => $phone,
            'accountNumber' => $accountNumber,
            'amount' => $amount,
            'merchantRequestId' => $response['MerchantRequestID'] ?? null,
            'checkoutRequestId' => $response['CheckoutRequestID'] ?? null,
            'status' => 'pending'
        ]);

        sendJson([
            'success' => true,
            'checkoutRequestId' => $response['CheckoutRequestID'] ?? null,
            'merchantRequestId' => $response['MerchantRequestID'] ?? null
        ]);
    }

    elseif ($endpoint === 'mpesa' && $action === 'stk-callback' && $method === 'POST') {
        $callback = $body ?: json_decode(file_get_contents('php://input'), true);
        $stk = $callback['Body']['stkCallback'] ?? null;
        if (!$stk) {
            sendJson(['success' => false], 400);
        }
        $checkoutRequestId = $stk['CheckoutRequestID'] ?? null;
        $resultCode = $stk['ResultCode'] ?? null;
        $resultDesc = $stk['ResultDesc'] ?? null;
        $metadata = $stk['CallbackMetadata']['Item'] ?? [];

        $mpesaReceipt = null;
        $transactionDate = null;
        $amountPaid = null;
        foreach ($metadata as $item) {
            if (($item['Name'] ?? '') === 'MpesaReceiptNumber') $mpesaReceipt = $item['Value'] ?? null;
            if (($item['Name'] ?? '') === 'TransactionDate') $transactionDate = $item['Value'] ?? null;
            if (($item['Name'] ?? '') === 'Amount') $amountPaid = $item['Value'] ?? null;
        }

        $status = ($resultCode === 0 || $resultCode === '0') ? 'success' : 'failed';
        $storage->updateMpesaStkRequestByCheckout($checkoutRequestId, [
            'status' => $status,
            'resultCode' => $resultCode,
            'resultDesc' => $resultDesc,
            'mpesaReceipt' => $mpesaReceipt,
            'transactionDate' => $transactionDate
        ]);

        if ($status === 'success') {
            $request = $storage->getMpesaStkRequestByCheckout($checkoutRequestId);
            if ($request && !empty($request['invoice_id'])) {
                $invoice = $storage->getInvoice($request['invoice_id']);
                $leaseId = $invoice['lease_id'] ?? null;
                $storage->createPayment([
                    'leaseId' => $leaseId,
                    'invoiceId' => $request['invoice_id'],
                    'amount' => $amountPaid ?? $request['amount'] ?? 0,
                    'paymentMethod' => 'M-Pesa',
                    'reference' => $mpesaReceipt ?? null,
                    'paymentDate' => date('Y-m-d')
                ]);
                sendTenantPaymentConfirmation($storage, $messagingService, $request['property_id'] ?? null, $request['tenant_id'] ?? null, $amountPaid ?? $request['amount'] ?? 0);
                if ($invoice) {
                    $totalPaid = array_sum(array_column($storage->getPaymentsByInvoice($request['invoice_id']), 'amount'));
                    if ($totalPaid >= ($invoice['amount'] ?? 0)) {
                        $storage->updateInvoice($request['invoice_id'], ['status' => 'paid']);
                    }
                    $storage->logActivity([
                        'action' => 'Payment Received',
                        'details' => "Payment of KSh {$amountPaid} received",
                        'type' => 'payment',
                        'status' => 'success',
                        'userId' => null,
                        'propertyId' => $request['property_id'] ?? null
                    ]);
                }
            }
        }

        sendJson(['success' => true]);
    }

    elseif ($endpoint === 'mpesa' && $action === 'balance' && $method === 'GET') {
        requireAuth();
        $propertyId = getQuery('propertyId');
        $landlordId = getQuery('landlordId') ?? $_SESSION['userId'] ?? null;
        $settings = $storage->getMpesaSettings($propertyId, $landlordId);
        if (!$settings || empty($settings['enabled'])) {
            sendJson(['error' => 'M-Pesa is not enabled for this property'], 400);
        }
        // Placeholder: Daraja account balance API requires additional security credential
        sendJson([
            'success' => true,
            'balance' => null,
            'message' => 'Balance endpoint configured; requires security credential.'
        ]);
    }

    // ========== TENANT ACCESS REQUESTS ==========
    elseif ($endpoint === 'tenant-access-requests' && $method === 'POST') {
        if (empty($body) && !empty($_POST)) {
            $body = $_POST;
        }
        $fullName = trim((string)($body['fullName'] ?? ''));
        $contact = trim((string)($body['contact'] ?? ''));
        $propertyId = $body['propertyId'] ?? null;
        $unitNumber = trim((string)($body['unitNumber'] ?? ''));
        $message = trim((string)($body['message'] ?? ''));

        if ($fullName === '' || $contact === '' || empty($propertyId)) {
            sendJson(['error' => 'fullName, contact, and propertyId are required'], 400);
        }

        $description = "Tenant portal access request\n";
        $description .= "Name: {$fullName}\n";
        $description .= "Contact: {$contact}\n";
        if ($unitNumber !== '') {
            $description .= "Unit: {$unitNumber}\n";
        }
        if ($message !== '') {
            $description .= "Message: {$message}\n";
        }

        $request = $storage->createMaintenanceRequest([
            'title' => 'Tenant Portal Access Request',
            'description' => $description,
            'status' => 'pending',
            'priority' => 'low',
            'propertyId' => $propertyId,
        ]);

        $storage->logActivity([
            'action' => 'Tenant Portal Access Requested',
            'details' => "Access request from {$fullName}",
            'type' => 'maintenance',
            'status' => 'warning',
            'userId' => null,
            'propertyId' => $propertyId
        ]);

        sendJson(['success' => true, 'request' => $request], 201);
    }

    // ========== MAINTENANCE REQUESTS ==========
    elseif ($endpoint === 'maintenance-requests') {
        if ($id === 'tenant' && $method === 'GET') {
            $tenantId = $action;
            if (!$tenantId) {
                sendJson(['error' => 'Tenant id is required'], 400);
            }
            if (isset($_SESSION['tenantId'])) {
                if ($_SESSION['tenantId'] !== $tenantId) {
                    sendJson(['error' => 'Unauthorized'], 403);
                }
            } else {
                requireAuth();
            }
            sendJson($storage->getMaintenanceRequests(['tenantId' => $tenantId]));
        }

        if ($method === 'GET' && !$id) {
            requireAuth();
            $filters = [
                'propertyId' => getQuery('propertyId'),
                'landlordId' => getQuery('landlordId'),
                'status' => getQuery('status')
            ];
            sendJson($storage->getMaintenanceRequests($filters));
        }

        if ($method === 'GET' && $id) {
            requireAuth();
            $request = $storage->getMaintenanceRequest($id);
            sendJson($request ?: ['error' => 'Maintenance request not found'], $request ? 200 : 404);
        }

        if ($method === 'POST') {
            if (!isset($_SESSION['userId']) && !isset($_SESSION['tenantId'])) {
                sendJson(['error' => 'Unauthorized'], 401);
            }
            if (empty($body) && !empty($_POST)) {
                $body = $_POST;
            }
            if (!isset($body['tenantId']) && isset($_SESSION['tenantId'])) {
                $body['tenantId'] = $_SESSION['tenantId'];
            }
            if (isset($body['tenantId']) && (!isset($body['propertyId']) || !isset($body['unitId']))) {
                $tenantProfile = $storage->getTenantPortalProfile($body['tenantId']);
                if ($tenantProfile) {
                    if (!isset($body['propertyId']) && !empty($tenantProfile['property_id'])) {
                        $body['propertyId'] = $tenantProfile['property_id'];
                    }
                    if (!isset($body['unitId']) && !empty($tenantProfile['unit_id'])) {
                        $body['unitId'] = $tenantProfile['unit_id'];
                    }
                }
            }

            $mediaUrls = [];
            if (!empty($_FILES['media'])) {
                $files = $_FILES['media'];
                $totalSize = 0;
                $publicRoot = realpath(__DIR__ . '/../public') ?: (__DIR__ . '/../public');
                $uploadDir = $publicRoot . '/uploads/maintenance';
                if (!is_dir($uploadDir) && !mkdir($uploadDir, 0777, true)) {
                    sendJson(['error' => 'Failed to create upload directory'], 500);
                }
                $allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov'];
                if (is_array($files['name'])) {
                    foreach ($files['name'] as $index => $name) {
                        if ($files['error'][$index] !== UPLOAD_ERR_OK) {
                            sendJson(['error' => 'Failed to upload media'], 400);
                        }
                        $size = $files['size'][$index] ?? 0;
                        $totalSize += $size;
                        if ($totalSize > 5 * 1024 * 1024) {
                            sendJson(['error' => 'Media exceeds 5MB limit'], 400);
                        }
                        $tmpName = $files['tmp_name'][$index] ?? null;
                        if (!$tmpName || !is_uploaded_file($tmpName)) {
                            sendJson(['error' => 'Invalid media upload'], 400);
                        }
                        $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                        if (!in_array($extension, $allowedExtensions, true)) {
                            sendJson(['error' => 'Unsupported media type'], 400);
                        }
                        $fileName = uniqid('media_', true) . '.' . $extension;
                        $destination = $uploadDir . '/' . $fileName;
                        if (!move_uploaded_file($tmpName, $destination)) {
                            sendJson(['error' => 'Failed to save media'], 500);
                        }
                        $mediaUrls[] = '/uploads/maintenance/' . $fileName;
                    }
                } else {
                    if ($files['error'] !== UPLOAD_ERR_OK) {
                        sendJson(['error' => 'Failed to upload media'], 400);
                    }
                    $size = $files['size'] ?? 0;
                    if ($size > 5 * 1024 * 1024) {
                        sendJson(['error' => 'Media exceeds 5MB limit'], 400);
                    }
                    $tmpName = $files['tmp_name'] ?? null;
                    if (!$tmpName || !is_uploaded_file($tmpName)) {
                        sendJson(['error' => 'Invalid media upload'], 400);
                    }
                    $extension = strtolower(pathinfo($files['name'] ?? '', PATHINFO_EXTENSION));
                    if (!in_array($extension, $allowedExtensions, true)) {
                        sendJson(['error' => 'Unsupported media type'], 400);
                    }
                    $fileName = uniqid('media_', true) . '.' . $extension;
                    $destination = $uploadDir . '/' . $fileName;
                    if (!move_uploaded_file($tmpName, $destination)) {
                        sendJson(['error' => 'Failed to save media'], 500);
                    }
                    $mediaUrls[] = '/uploads/maintenance/' . $fileName;
                }
            }
            if (!empty($mediaUrls)) {
                $body['mediaUrls'] = json_encode($mediaUrls);
            }
            $request = $storage->createMaintenanceRequest($body);
            $storage->logActivity([
                'action' => 'Maintenance Request Created',
                'details' => "Request \"{$request['title']}\" created",
                'type' => 'maintenance',
                'status' => 'success',
                'userId' => $_SESSION['userId'] ?? null,
                'propertyId' => $request['property_id'] ?? null
            ]);
            sendJson($request, 201);
        }

        if ($method === 'PUT' && $id) {
            requireAuth();
            $request = $storage->updateMaintenanceRequest($id, $body);
            if ($request) {
                $storage->logActivity([
                    'action' => 'Maintenance Request Updated',
                    'details' => "Request \"{$request['title']}\" updated",
                    'type' => 'maintenance',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $request['property_id'] ?? null
                ]);
            }
            sendJson($request ?: ['error' => 'Maintenance request not found'], $request ? 200 : 404);
        }

        if ($method === 'DELETE' && $id) {
            requireAuth();
            $success = $storage->deleteMaintenanceRequest($id);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Maintenance Request Deleted',
                    'details' => "Request deleted",
                    'type' => 'maintenance',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
            }
            sendJson([], $success ? 204 : 404);
        }
    }

    // ========== ACTIVITY LOGS ==========
    elseif ($endpoint === 'activity-logs') {
        requireAuth();
        if ($method === 'GET' && !$id) {
            $filters = [
                'type' => getQuery('type'),
                'userId' => getQuery('userId'),
                'propertyId' => getQuery('propertyId'),
                'search' => getQuery('search'),
                'dateFrom' => getQuery('dateFrom'),
                'dateTo' => getQuery('dateTo'),
                'limit' => getQuery('limit'),
            ];
            sendJson($storage->getActivityLogs($filters));
        }
        
        if ($method === 'POST') {
            $activityId = $storage->logActivity([
                'action' => $body['action'] ?? 'Activity',
                'details' => $body['details'] ?? null,
                'type' => $body['type'] ?? 'system',
                'status' => $body['status'] ?? 'success',
                'userId' => $_SESSION['userId'] ?? null,
                'propertyId' => $body['propertyId'] ?? null
            ]);
            sendJson(['id' => $activityId, 'success' => true], 201);
        }
    }
    
    // ========== MESSAGES ==========
    elseif ($endpoint === 'messages') {
        if ($method === 'GET' && !$id) {
            $tenantId = getQuery('tenantId');
            $propertyId = getQuery('propertyId');
            
            if ($tenantId) {
                sendJson($storage->getMessagesByTenant($tenantId));
            } elseif ($propertyId) {
                sendJson($storage->getMessagesByProperty($propertyId));
            } else {
                sendJson($storage->getAllMessages());
            }
        }
        
        if ($method === 'GET' && $id) {
            $message = $storage->getMessage($id);
            sendJson($message ?: ['error' => 'Message not found'], $message ? 200 : 404);
        }
        
        if ($method === 'POST') {
            $message = $storage->createMessage($body);
            sendJson($message, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $message = $storage->updateMessage($id, $body);
            sendJson($message ?: ['error' => 'Message not found'], $message ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteMessage($id);
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== BULK MESSAGES ==========
    elseif ($endpoint === 'bulk-messages') {
        if ($method === 'GET' && !$id) {
            sendJson($storage->getAllBulkMessages());
        }
        
        if ($method === 'GET' && $id) {
            $message = $storage->getBulkMessage($id);
            sendJson($message ?: ['error' => 'Bulk message not found'], $message ? 200 : 404);
        }
        
        if ($method === 'POST') {
            $message = $storage->createBulkMessage($body);
            sendJson($message, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $message = $storage->updateBulkMessage($id, $body);
            sendJson($message ?: ['error' => 'Bulk message not found'], $message ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteBulkMessage($id);
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== MESSAGE RECIPIENTS ==========
    elseif ($endpoint === 'message-recipients') {
        $normalizeRecipients = function ($rows) {
            foreach ($rows as &$row) {
                if (empty($row['recipient_name']) && !empty($row['recipient_contact'])) {
                    $row['recipient_name'] = $row['recipient_contact'];
                }
                if (empty($row['message_category'])) {
                    $row['message_category'] = 'manual';
                }
                if (empty($row['recipient_type'])) {
                    $row['recipient_type'] = !empty($row['tenant_id']) ? 'tenant' : 'landlord';
                }
            }
            unset($row);
            return $rows;
        };

        if ($method === 'GET' && !$id) {
            $bulkMessageId = getQuery('bulkMessageId');
            $tenantId = getQuery('tenantId');
            $channel = getQuery('channel'); // sms, email, or null for all
            $category = getQuery('category'); // manual, otp, login_credentials, etc.
            $propertyId = getQuery('propertyId');
            $recipientType = getQuery('recipientType'); // tenant, landlord
            $search = getQuery('search');
            $sender = getQuery('sender');
            $dateFrom = getQuery('dateFrom');
            $dateTo = getQuery('dateTo');
            
            // If filtering by any params, use enhanced query
            if ($channel || $category || $propertyId || $recipientType || $search || $sender || $dateFrom || $dateTo) {
                $sql = "SELECT mr.*, COALESCE(u.full_name, u.username) AS sent_by_name
                        FROM message_recipients mr
                        LEFT JOIN users u ON mr.sent_by_user_id = u.id
                        WHERE 1=1";
                $params = [];
                
                if ($channel) {
                    $sql .= " AND mr.channel = ?";
                    $params[] = $channel;
                }
                if ($category) {
                    $sql .= " AND mr.message_category = ?";
                    $params[] = $category;
                }
                if ($propertyId) {
                    $sql .= " AND mr.property_id = ?";
                    $params[] = $propertyId;
                }
                if ($recipientType) {
                    $sql .= " AND mr.recipient_type = ?";
                    $params[] = $recipientType;
                }
                if ($search) {
                    $sql .= " AND (mr.recipient_contact LIKE ? OR mr.recipient_name LIKE ?)";
                    $searchParam = '%' . $search . '%';
                    $params[] = $searchParam;
                    $params[] = $searchParam;
                }
                if ($sender) {
                    $sql .= " AND mr.sender_shortcode LIKE ?";
                    $params[] = '%' . $sender . '%';
                }
                if ($dateFrom) {
                    $sql .= " AND mr.created_at >= ?";
                    $params[] = $dateFrom . ' 00:00:00';
                }
                if ($dateTo) {
                    $sql .= " AND mr.created_at <= ?";
                    $params[] = $dateTo . ' 23:59:59';
                }
                
                $sql .= " ORDER BY mr.created_at DESC LIMIT 500";
                
                global $pdo;
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $results = $stmt->fetchAll();

                sendJson($normalizeRecipients($results));
            } elseif ($bulkMessageId) {
                sendJson($normalizeRecipients($storage->getMessageRecipientsByBulkMessage($bulkMessageId)));
            } elseif ($tenantId) {
                sendJson($normalizeRecipients($storage->getMessageRecipientsByTenant($tenantId)));
            } else {
                sendJson($normalizeRecipients($storage->getAllMessageRecipients()));
            }
        }
        
        if ($method === 'GET' && $id) {
            $recipient = $storage->getMessageRecipient($id);
            sendJson($recipient ?: ['error' => 'Message recipient not found'], $recipient ? 200 : 404);
        }
        
        if ($method === 'POST') {
            // Use MessagingService for logging if available
            global $messagingService;
            if (isset($messagingService) && isset($body['channel'])) {
                $logId = $messagingService->logMessage($body);
                sendJson(['id' => $logId, 'success' => true], 201);
            } else {
                $recipient = $storage->createMessageRecipient($body);
                sendJson($recipient, 201);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $recipient = $storage->updateMessageRecipient($id, $body);
            sendJson($recipient ?: ['error' => 'Message recipient not found'], $recipient ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteMessageRecipient($id);
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== MESSAGE TEMPLATES ==========
    elseif ($endpoint === 'message-templates') {
        requireAuth();
        
        if ($method === 'GET' && !$id) {
            sendJson($storage->getAllMessageTemplates());
        }
        
        if ($method === 'GET' && $id) {
            $template = $storage->getMessageTemplate($id);
            sendJson($template ?: ['error' => 'Template not found'], $template ? 200 : 404);
        }
        
        if ($method === 'POST') {
            $template = $storage->createMessageTemplate($body);
            if (!$template) {
                sendJson(['error' => 'Message templates are not configured'], 500);
            }
            $storage->logActivity([
                'action' => 'Template Created',
                'details' => 'Created message template: ' . ($template['name'] ?? 'Unnamed'),
                'type' => 'messaging',
                'status' => 'success',
                'userId' => $_SESSION['userId'] ?? null
            ]);
            sendJson($template, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $template = $storage->updateMessageTemplate($id, $body);
            if (!$template) {
                sendJson(['error' => 'Message templates are not configured'], 500);
            }
            if ($template) {
                $storage->logActivity([
                    'action' => 'Template Updated',
                    'details' => 'Updated message template: ' . ($template['name'] ?? $id),
                    'type' => 'messaging',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
            }
            sendJson($template ?: ['error' => 'Template not found'], $template ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteMessageTemplate($id);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Template Deleted',
                    'details' => "Deleted message template: {$id}",
                    'type' => 'messaging',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null
                ]);
            }
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== MESSAGE EXPORT (CSV) ==========
    elseif ($endpoint === 'message-export' && $method === 'GET') {
        requireAuth();
        
        $dateFrom = getQuery('dateFrom');
        $dateTo = getQuery('dateTo');
        $channel = getQuery('channel') ?: 'sms';
        $search = getQuery('search');
        $sender = getQuery('sender');
        $propertyId = getQuery('propertyId');
        
        if (!$dateFrom || !$dateTo) {
            sendJson(['error' => 'dateFrom and dateTo are required'], 400);
        }
        
        $sql = "SELECT mr.*, COALESCE(u.full_name, u.username) AS sent_by_name
                FROM message_recipients mr
                LEFT JOIN users u ON mr.sent_by_user_id = u.id
                WHERE mr.channel = ?
                  AND mr.created_at >= ?
                  AND mr.created_at <= ?";
        $params = [
            $channel,
            $dateFrom . ' 00:00:00',
            $dateTo . ' 23:59:59'
        ];
        
        if ($propertyId) {
            $sql .= " AND mr.property_id = ?";
            $params[] = $propertyId;
        }
        if ($search) {
            $sql .= " AND (mr.recipient_contact LIKE ? OR mr.recipient_name LIKE ?)";
            $searchParam = '%' . $search . '%';
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        if ($sender) {
            $sql .= " AND mr.sender_shortcode LIKE ?";
            $params[] = '%' . $sender . '%';
        }
        
        $sql .= " ORDER BY mr.created_at DESC";
        
        global $pdo;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $storage->logActivity([
            'action' => 'Message Export',
            'details' => "Exported {$channel} messages from {$dateFrom} to {$dateTo}",
            'type' => 'messaging',
            'status' => 'success',
            'userId' => $_SESSION['userId'] ?? null,
            'propertyId' => $propertyId
        ]);
        
        $filename = "message-export-{$dateFrom}-{$dateTo}.csv";
        header('Content-Type: text/csv; charset=utf-8');
        header("Content-Disposition: attachment; filename=\"{$filename}\"");
        
        $output = fopen('php://output', 'w');
        fputcsv($output, [
            'Channel',
            'Recipient Name',
            'Recipient Contact',
            'Status',
            'Delivery Status',
            'Sender Shortcode',
            'Sent By',
            'Category',
            'Message',
            'Sent At',
            'Created At'
        ]);
        
        foreach ($rows as $row) {
            fputcsv($output, [
                $row['channel'] ?? '',
                $row['recipient_name'] ?? '',
                $row['recipient_contact'] ?? '',
                $row['status'] ?? '',
                $row['delivery_status'] ?? '',
                $row['sender_shortcode'] ?? '',
                $row['sent_by_name'] ?? '',
                $row['message_category'] ?? '',
                $row['content'] ?? '',
                $row['sent_at'] ?? '',
                $row['created_at'] ?? ''
            ]);
        }
        fclose($output);
        exit;
    }
    
    // ========== INVOICE ITEMS ==========
    elseif ($endpoint === 'invoice-items') {
        if ($method === 'GET' && !$id) {
            sendJson($storage->getAllInvoiceItems());
        }
        
        if ($method === 'GET' && $id) {
            $item = $storage->getInvoiceItem($id);
            sendJson($item ?: ['error' => 'Invoice item not found'], $item ? 200 : 404);
        }
        
        if ($method === 'POST') {
            $item = $storage->createInvoiceItem($body);
            sendJson($item, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $item = $storage->updateInvoiceItem($id, $body);
            sendJson($item ?: ['error' => 'Invoice item not found'], $item ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteInvoiceItem($id);
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== WATER READINGS ==========
    elseif ($endpoint === 'water-readings') {
        if ($method === 'GET' && !$id) {
            $status = getQuery('status');
            if ($status) {
                sendJson($storage->getWaterReadingsByStatus($status));
            } else {
                sendJson($storage->getAllWaterReadings());
            }
        }
        
        if ($method === 'GET' && $id) {
            $reading = $storage->getWaterReading($id);
            sendJson($reading ?: ['error' => 'Water reading not found'], $reading ? 200 : 404);
        }
        
        if ($method === 'POST') {
            $reading = $storage->createWaterReading($body);
            if ($reading) {
                $unit = $storage->getUnit($reading['unit_id'] ?? null);
                $storage->logActivity([
                    'action' => 'Water Reading Added',
                    'details' => $unit ? "Water reading recorded for unit \"{$unit['unit_number']}\"" : 'Water reading recorded',
                    'type' => 'water_reading',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $unit['property_id'] ?? null
                ]);
            }
            sendJson($reading, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $reading = $storage->updateWaterReading($id, $body);
            if ($reading) {
                $unit = $storage->getUnit($reading['unit_id'] ?? null);
                $storage->logActivity([
                    'action' => 'Water Reading Updated',
                    'details' => $unit ? "Water reading updated for unit \"{$unit['unit_number']}\"" : 'Water reading updated',
                    'type' => 'water_reading',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $unit['property_id'] ?? null
                ]);
            }
            sendJson($reading ?: ['error' => 'Water reading not found'], $reading ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $reading = $storage->getWaterReading($id);
            $unit = $reading ? $storage->getUnit($reading['unit_id'] ?? null) : null;
            $success = $storage->deleteWaterReading($id);
            sendJson([], $success ? 204 : 404);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Water Reading Deleted',
                    'details' => $unit ? "Water reading deleted for unit \"{$unit['unit_number']}\"" : 'Water reading deleted',
                    'type' => 'water_reading',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $unit['property_id'] ?? null
                ]);
            }
        }
    }
    
    // Special route: /api/units/:unitId/water-readings
    elseif ($endpoint === 'units' && $id && $action === 'water-readings' && $method === 'GET') {
        sendJson($storage->getWaterReadingsByUnit($id));
    }
    
    // ========== CHARGE CODES ==========
    elseif ($endpoint === 'charge-codes') {
        if ($method === 'GET' && !$id) {
            $propertyId = getQuery('propertyId');
            if ($propertyId) {
                sendJson($storage->getChargeCodesByProperty($propertyId));
            } else {
                sendJson([]);
            }
        }
        
        if ($method === 'GET' && $id) {
            $chargeCode = $storage->getChargeCode($id);
            sendJson($chargeCode ?: ['error' => 'Charge code not found'], $chargeCode ? 200 : 404);
        }
        
        if ($method === 'POST') {
            try {
                if (empty($body['propertyId'])) {
                    sendJson(['error' => 'propertyId is required'], 400);
                }
                $chargeCode = $storage->createChargeCode($body);
                if ($chargeCode) {
                    $storage->logActivity([
                        'action' => 'Charge Code Created',
                        'details' => "Charge code \"{$chargeCode['name']}\" created",
                        'type' => 'charge_code',
                        'status' => 'success',
                        'userId' => $_SESSION['userId'] ?? null,
                        'propertyId' => $chargeCode['property_id'] ?? null
                    ]);
                }
                sendJson($chargeCode, 201);
            } catch (Exception $e) {
                error_log("Charge code create failed: " . $e->getMessage());
                sendJson(['error' => $e->getMessage()], 400);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $chargeCode = $storage->updateChargeCode($id, $body);
            if ($chargeCode) {
                $storage->logActivity([
                    'action' => 'Charge Code Updated',
                    'details' => "Charge code \"{$chargeCode['name']}\" updated",
                    'type' => 'charge_code',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $chargeCode['property_id'] ?? null
                ]);
            }
            sendJson($chargeCode ?: ['error' => 'Charge code not found'], $chargeCode ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $chargeCode = $storage->getChargeCode($id);
            $success = $storage->deleteChargeCode($id);
            sendJson([], $success ? 204 : 404);
            if ($success) {
                $storage->logActivity([
                    'action' => 'Charge Code Deleted',
                    'details' => $chargeCode ? "Charge code \"{$chargeCode['name']}\" deleted" : 'Charge code deleted',
                    'type' => 'charge_code',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $chargeCode['property_id'] ?? null
                ]);
            }
        }
    }
    
    // ========== STATS ==========
    elseif ($endpoint === 'stats' && $method === 'GET') {
        sendJson($storage->getPropertyStats());
    }
    
    // ========== USERS ==========
    elseif ($endpoint === 'users') {
        requireAuth();
        if ($method === 'GET' && !$id) {
            $propertyId = getQuery('propertyId');
            $landlordId = getQuery('landlordId');
            $currentUser = $storage->getUser($_SESSION['userId'] ?? null);
            $currentRole = $currentUser['role'] ?? 'landlord';
            if (isLandlordRole($currentRole) && !$landlordId) {
                $landlordId = $currentUser['id'] ?? null;
            }
            $filters = [];
            if ($propertyId) {
                $filters['propertyId'] = $propertyId;
            }
            if ($landlordId) {
                $filters['landlordId'] = $landlordId;
            }
            if ($currentRole === 'admin') {
                $filters['adminId'] = $currentUser['id'] ?? null;
            }
            $users = $storage->getUsers($filters);
            foreach ($users as &$user) {
                $user['propertyIds'] = $storage->getUserPropertyIds($user['id']);
            }
            unset($user);
            sendJson($users);
        }
        
        if ($method === 'GET' && $id) {
            $user = $storage->getUser($id);
            if ($user) {
                $user['propertyIds'] = $storage->getUserPropertyIds($user['id']);
            }
            sendJson($user ?: ['error' => 'User not found'], $user ? 200 : 404);
        }
        
        if ($method === 'POST' && !$id) {
            $currentUser = $storage->getUser($_SESSION['userId'] ?? null);
            $currentRole = $currentUser['role'] ?? 'landlord';
            $isAdmin = $currentRole === 'admin' || $currentRole === 'super_admin';
            $requestedLandlordId = $body['landlordId'] ?? null;
            $propertyIds = $body['propertyIds'] ?? [];
            if (!is_array($propertyIds)) {
                $propertyIds = [];
            }
            if (!$isAdmin && empty($propertyIds)) {
                sendJson(['error' => 'At least one property must be assigned'], 400);
            }
            if (isLandlordRole($currentRole) && !empty($propertyIds)) {
                $allowedProperties = $storage->getAllProperties($currentUser['id'] ?? null, null);
                $allowedIds = array_map(static function ($property) {
                    return (string)($property['id'] ?? '');
                }, $allowedProperties);
                $propertyIds = array_values(array_unique(array_map('strval', $propertyIds)));
                $invalid = array_diff($propertyIds, $allowedIds);
                if (!empty($invalid)) {
                    sendJson(['error' => 'One or more assigned properties are not allowed'], 403);
                }
            }
            $landlordIdForUser = null;
            if ($isAdmin) {
                $landlordIdForUser = $requestedLandlordId;
            } elseif (isLandlordRole($currentRole)) {
                $landlordIdForUser = $currentUser['id'] ?? null;
            }
            $adminIdForUser = null;
            if ($isAdmin) {
                $adminIdForUser = $currentUser['id'] ?? null;
            } elseif (isLandlordRole($currentRole)) {
                $adminIdForUser = $currentUser['admin_id'] ?? null;
            }
            if ($isAdmin && $landlordIdForUser) {
                $landlordOwner = $storage->getUser($landlordIdForUser);
                if (!empty($landlordOwner['admin_id'])) {
                    $adminIdForUser = $landlordOwner['admin_id'];
                }
            }
            if (empty($body['username'])) {
                sendJson(['error' => 'username is required'], 400);
            }
            $password = $body['password'] ?? bin2hex(random_bytes(4));
            $hashedPassword = $password;
            if (strpos($password, '$2') !== 0) {
                $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            }
            $primaryPropertyId = !empty($propertyIds) ? $propertyIds[0] : null;
            $user = $storage->createUser([
                'username' => $body['username'] ?? null,
                'password' => $hashedPassword,
                'role' => $body['role'] ?? 'admin',
                'fullName' => $body['fullName'] ?? null,
                'phone' => $body['phone'] ?? null,
                'idNumber' => $body['idNumber'] ?? null,
                'propertyId' => $primaryPropertyId,
                'landlordId' => $landlordIdForUser,
                'adminId' => $adminIdForUser,
                'permissions' => $body['permissions'] ?? [],
                'otpEnabled' => $body['otpEnabled'] ?? null
            ]);
            if (!$user) {
                sendJson(['error' => 'Failed to create user'], 400);
            }
            $storage->setUserProperties($user['id'], $propertyIds);
            $user['propertyIds'] = $storage->getUserPropertyIds($user['id']);
            $storage->logActivity([
                'action' => 'User Created',
                'details' => "User \"{$user['username']}\" created",
                'type' => 'user',
                'status' => 'success',
                'userId' => $_SESSION['userId'] ?? null,
                'propertyId' => $primaryPropertyId
            ]);
            sendJson(array_merge($user, ['generatedPassword' => $password]), 201);
        }
        
        if ($id && $action === 'send-login-details' && $method === 'POST') {
            $user = $storage->getUser($id);
            if (!$user) {
                sendJson(['error' => 'User not found'], 404);
            }
            $password = bin2hex(random_bytes(4));
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $storage->setUserPassword($id, $hashedPassword, true);
            $sent = false;
            $sentError = null;
            $sentByUserId = $_SESSION['userId'] ?? null;
            $propertyId = $user['property_id'] ?? null;
            $recipient = $user['username'] ?? null;
            $recipientEmail = ($recipient && strpos($recipient, '@') !== false) ? $recipient : ($user['email'] ?? null);
            $recipientPhone = $user['phone'] ?? null;
            $sendResults = ['sms' => ['success' => false], 'email' => ['success' => false]];
            $messageCategory = 'user_login_credentials';
            $recipientName = $user['full_name'] ?? $user['fullName'] ?? $recipient;
            $senderShortcode = getenv('SYSTEM_SMS_SHORTCODE') ?: 'AdvantaSMS';
            $userRole = $user['role'] ?? 'admin';
            $loginUrl = ($userRole === 'client' || $userRole === 'landlord')
                ? 'https://portal.theleasemaster.com/login'
                : 'https://admin.theleasemaster.com/login';

            global $messagingService;

            if (!empty($recipientPhone)) {
                $smsMessage = "LeaseMaster login details:\n";
                $smsMessage .= "Login: {$loginUrl}\n";
                $smsMessage .= "Username: {$recipient}\n";
                $smsMessage .= "Temporary password: {$password}\n";
                $smsMessage .= "Please change it after login.";
                $smsResult = $messagingService->sendSystemSMS($recipientPhone, $smsMessage);
                $sendResults['sms'] = $smsResult;
                $messagingService->logMessage([
                    'channel' => 'sms',
                    'recipientContact' => $recipientPhone,
                    'status' => !empty($smsResult['success']) ? 'sent' : 'failed',
                    'messageCategory' => $messageCategory,
                    'recipientType' => 'user',
                    'recipientName' => $recipientName,
                    'content' => $smsMessage,
                    'propertyId' => $propertyId,
                    'externalMessageId' => $smsResult['messageId'] ?? null,
                    'senderShortcode' => $senderShortcode,
                    'sentByUserId' => $sentByUserId
                ]);
            }

            if ($recipientEmail && filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
                $emailSubject = "LeaseMaster Login Details";
                $emailBody = "<html><body>";
                $emailBody .= "<h3>Your LeaseMaster Login Details</h3>";
                $emailBody .= "<p><strong>Login:</strong> <a href='{$loginUrl}'>{$loginUrl}</a></p>";
                $emailBody .= "<p><strong>Username:</strong> {$recipient}</p>";
                $emailBody .= "<p><strong>Temporary Password:</strong> {$password}</p>";
                $emailBody .= "<p>Please change your password after logging in.</p>";
                $emailBody .= "</body></html>";
                $emailResult = $messagingService->sendEmail($recipientEmail, $recipientName, $emailSubject, $emailBody, true);
                $sendResults['email'] = $emailResult;
                $messagingService->logMessage([
                    'channel' => 'email',
                    'recipientContact' => $recipientEmail,
                    'status' => !empty($emailResult['success']) ? 'sent' : 'failed',
                    'messageCategory' => $messageCategory,
                    'recipientType' => 'user',
                    'recipientName' => $recipientName,
                    'subject' => $emailSubject,
                    'content' => $emailBody,
                    'propertyId' => $propertyId,
                    'externalMessageId' => $emailResult['messageId'] ?? null,
                    'sentByUserId' => $sentByUserId
                ]);
            }

            $sent = ($sendResults['sms']['success'] ?? false) || ($sendResults['email']['success'] ?? false);
            if (!$sent) {
                $sentError = $sendResults['sms']['error'] ?? ($sendResults['email']['error'] ?? 'No delivery channels available');
            }
            $storage->logActivity([
                'action' => 'Login Details Sent',
                'details' => "Login details sent to user \"{$user['username']}\"",
                'type' => 'user',
                'status' => $sent ? 'success' : 'warning',
                'userId' => $sentByUserId,
                'propertyId' => $propertyId
            ]);
            sendJson([
                'success' => true,
                'generatedPassword' => $password,
                'sent' => [
                    'sms' => !empty($sendResults['sms']['success']),
                    'email' => !empty($sendResults['email']['success'])
                ],
                'emailSent' => $sendResults['email']['success'] ?? false,
                'emailError' => $sentError
            ], 200);
        }
        
        if ($id && $action === 'reset-password' && $method === 'POST') {
            $user = $storage->getUser($id);
            if (!$user) {
                sendJson(['error' => 'User not found'], 404);
            }
            $password = bin2hex(random_bytes(4));
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $storage->setUserPassword($id, $hashedPassword, true);
            $storage->logActivity([
                'action' => 'Password Reset',
                'details' => "Password reset for user \"{$user['username']}\"",
                'type' => 'user',
                'status' => 'warning',
                'userId' => $_SESSION['userId'] ?? null,
                'propertyId' => $user['property_id'] ?? null
            ]);
            sendJson(['success' => true, 'generatedPassword' => $password], 200);
        }
        
        if ($id && $action === 'otp' && $method === 'POST') {
            $enabled = isset($body['enabled']) ? (bool)$body['enabled'] : false;
            $user = $storage->updateUser($id, ['otpEnabled' => $enabled]);
            if (!$user) {
                sendJson(['error' => 'User not found'], 404);
            }
            $storage->logActivity([
                'action' => $enabled ? 'OTP Enabled' : 'OTP Disabled',
                'details' => "OTP " . ($enabled ? 'enabled' : 'disabled') . " for user \"{$user['username']}\"",
                'type' => 'user',
                'status' => 'success',
                'userId' => $_SESSION['userId'] ?? null,
                'propertyId' => $user['property_id'] ?? null
            ]);
            sendJson($user, 200);
        }
        
        if ($method === 'PUT' && $id) {
            $currentUser = $storage->getUser($_SESSION['userId'] ?? null);
            $currentRole = $currentUser['role'] ?? 'landlord';
            $isAdmin = $currentRole === 'admin' || $currentRole === 'super_admin';
            $propertyIds = $body['propertyIds'] ?? null;
            if ($propertyIds !== null && !is_array($propertyIds)) {
                $propertyIds = [];
            }
            if (!$isAdmin && is_array($propertyIds) && empty($propertyIds)) {
                sendJson(['error' => 'At least one property must be assigned'], 400);
            }
            if (isLandlordRole($currentRole) && is_array($propertyIds) && !empty($propertyIds)) {
                $allowedProperties = $storage->getAllProperties($currentUser['id'] ?? null, null);
                $allowedIds = array_map(static function ($property) {
                    return (string)($property['id'] ?? '');
                }, $allowedProperties);
                $propertyIds = array_values(array_unique(array_map('strval', $propertyIds)));
                $invalid = array_diff($propertyIds, $allowedIds);
                if (!empty($invalid)) {
                    sendJson(['error' => 'One or more assigned properties are not allowed'], 403);
                }
            }
            $updatePayload = $body;
            if (isLandlordRole($currentRole)) {
                $updatePayload['landlordId'] = $currentUser['id'] ?? null;
            } elseif ($isAdmin && array_key_exists('landlordId', $body)) {
                $updatePayload['landlordId'] = $body['landlordId'];
            }
            $user = $storage->updateUser($id, $updatePayload);
            if ($user && is_array($propertyIds)) {
                $storage->setUserProperties($id, $propertyIds);
                $user['propertyIds'] = $storage->getUserPropertyIds($id);
            }
            if ($user) {
                $storage->logActivity([
                    'action' => 'User Updated',
                    'details' => "User \"{$user['username']}\" updated",
                    'type' => 'user',
                    'status' => 'success',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $user['property_id'] ?? null
                ]);
            }
            sendJson($user ?: ['error' => 'User not found'], $user ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $user = $storage->getUser($id);
            $success = $storage->deleteUser($id);
            if ($success) {
                $storage->logActivity([
                    'action' => 'User Deleted',
                    'details' => $user ? "User \"{$user['username']}\" deleted" : 'User deleted',
                    'type' => 'user',
                    'status' => 'warning',
                    'userId' => $_SESSION['userId'] ?? null,
                    'propertyId' => $user['property_id'] ?? null
                ]);
            }
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== PUBLIC ROUTES ==========
    elseif ($endpoint === 'public' && isset($segments[1]) && $segments[1] === 'drive-image' && isset($segments[2])) {
        // /api/public/drive-image/:fileId
        // Proxy Google Drive-hosted images so <img> always receives image bytes
        $fileId = $segments[2];
        
        // #region agent log
        $logPath = __DIR__ . '/../../.cursor/debug.log';
        @file_put_contents($logPath, json_encode([
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'H1,H3',
            'location' => 'api/index.php:754',
            'message' => 'Drive image route hit',
            'data' => ['fileId' => $fileId, 'endpoint' => $endpoint, 'segments' => $segments, 'fullPath' => $path],
            'timestamp' => round(microtime(true) * 1000)
        ]) . "\n", FILE_APPEND);
        // #endregion
        
        // Validate file ID (alphanumeric, underscores, hyphens only)
        // Clean fileId - remove any query params that might have been parsed as part of path
        $fileId = explode('&', $fileId)[0];
        $fileId = explode('?', $fileId)[0];
        
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $fileId)) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Invalid file id']);
            exit;
        }
        
        // Try Drive endpoints with fallback (download/view deprecated Jan 2024)
        // Order: thumbnail (works 2024+) -> view (may fail) -> download (deprecated)
        $driveUrls = [
            'https://drive.google.com/thumbnail?id=' . urlencode($fileId) . '&sz=w1920', // Recommended endpoint as of 2024
            'https://drive.google.com/uc?export=view&id=' . urlencode($fileId), // May return 403
            'https://drive.google.com/uc?export=download&id=' . urlencode($fileId), // Deprecated, may return 403
        ];
        
        $driveUrl = null;
        $httpCode = 0;
        $contentType = null;
        $curlError = null;
        
        // Try each URL until one works
        foreach ($driveUrls as $testUrl) {
            $ch = curl_init($testUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_NOBODY => true,
                CURLOPT_HEADER => true,
                CURLOPT_HTTPHEADER => [
                    'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                    'User-Agent: LeaseMasterImageProxy/1.0',
                ],
            ]);
            
            curl_exec($ch);
            $testHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $testContentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            $testCurlError = curl_errno($ch) ? curl_error($ch) : null;
            curl_close($ch);
            
            // #region agent log
            $logPath = __DIR__ . '/../../.cursor/debug.log';
            @file_put_contents($logPath, json_encode([
                'sessionId' => 'debug-session',
                'runId' => 'run1',
                'hypothesisId' => 'H4',
                'location' => 'api/index.php:786',
                'message' => 'Drive HEAD request result',
                'data' => ['testUrl' => $testUrl, 'httpCode' => $testHttpCode, 'contentType' => $testContentType, 'curlError' => $testCurlError, 'fileId' => $fileId],
                'timestamp' => round(microtime(true) * 1000)
            ]) . "\n", FILE_APPEND);
            // #endregion
            
            if ($testHttpCode === 200 && !$testCurlError) {
                $driveUrl = $testUrl;
                $httpCode = $testHttpCode;
                $contentType = $testContentType;
                break;
            }
        }
        
        if (!$driveUrl || $httpCode !== 200) {
            http_response_code(502);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch image from Google Drive', 'tried' => count($driveUrls), 'lastCode' => $httpCode]);
            exit;
        }
        
        // Set headers before streaming
        header('Content-Type: ' . ($contentType ?: 'image/jpeg'));
        header('Cache-Control: public, max-age=86400');
        
        // Now stream the actual image
        $ch = curl_init($driveUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_WRITEFUNCTION => function($ch, $data) {
                echo $data;
                return strlen($data);
            },
            CURLOPT_HTTPHEADER => [
                'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'User-Agent: LeaseMasterImageProxy/1.0',
            ],
        ]);
        
        $streamResult = curl_exec($ch);
        $streamError = curl_errno($ch) ? curl_error($ch) : null;
        $streamHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        // #region agent log
        $logPath = __DIR__ . '/../../.cursor/debug.log';
        @file_put_contents($logPath, json_encode([
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'H4',
            'location' => 'api/index.php:816',
            'message' => 'Drive stream result',
            'data' => ['streamResult' => $streamResult !== false, 'streamError' => $streamError, 'streamHttpCode' => $streamHttpCode],
            'timestamp' => round(microtime(true) * 1000)
        ]) . "\n", FILE_APPEND);
        // #endregion
        
        if ($streamResult === false || $streamError) {
            http_response_code(502);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Error streaming image', 'details' => $streamError]);
            exit;
        }
        if ($streamHttpCode !== 200) {
            http_response_code(502);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Error streaming image', 'httpCode' => $streamHttpCode]);
            exit;
        }
        exit;
    }
    
    // ========== SMS BALANCE ==========
    elseif ($endpoint === 'sms-balance' && $method === 'GET') {
        global $messagingService;
        
        // Check if a propertyId is provided (for property-specific balance)
        $propertyId = getQuery('propertyId');
        
        if ($propertyId) {
            // Get property-specific SMS balance
            $result = $messagingService->getPropertySmsBalance($propertyId);
        } else {
            // Get system SMS balance (admin view)
            $result = $messagingService->getSystemSmsBalance();
        }
        
        sendJson([
            'balance' => $result['balance'] ?? 0,
            'currency' => 'KES',
            'success' => $result['success'] ?? false,
            'error' => $result['error'] ?? null
        ], 200);
    }

    // ========== EMAIL BALANCE ==========
    elseif ($endpoint === 'email-balance' && $method === 'GET') {
        requireAuth();
        $propertyId = getQuery('propertyId');
        $landlordId = getQuery('landlordId') ?? $_SESSION['userId'] ?? null;
        $settings = $storage->getEmailSettings($propertyId, $landlordId);
        $balance = isset($settings['credit_balance']) ? intval($settings['credit_balance']) : null;
        $threshold = isset($settings['credit_threshold']) ? intval($settings['credit_threshold']) : null;
        sendJson([
            'balance' => $balance,
            'threshold' => $threshold
        ], 200);
    }
    
    // ========== PROPERTY SMS SETTINGS ==========
    elseif ($endpoint === 'property-sms-settings') {
        global $messagingService;
        requireAuth();
        
        $propertyId = getQuery('propertyId') ?? $id;
        
        if ($method === 'GET' && $propertyId) {
            $settings = $messagingService->getPropertySmsSettings($propertyId);
            sendJson($settings ?: [
                'property_id' => $propertyId,
                'enabled' => false,
                'api_url' => null,
                'api_key' => null,
                'partner_id' => null,
                'shortcode' => null
            ]);
        }
        
        if ($method === 'POST' || $method === 'PUT') {
            if (!$propertyId) {
                sendJson(['error' => 'propertyId is required'], 400);
            }
            $settings = $messagingService->savePropertySmsSettings($propertyId, $body);
            sendJson($settings, 200);
        }
    }
    
    // ========== SEND SMS (Manual) ==========
    elseif ($endpoint === 'send-sms' && $method === 'POST') {
        global $messagingService;
        requireAuth();
        
        $mobile = $body['mobile'] ?? null;
        $message = $body['message'] ?? null;
        $propertyId = $body['propertyId'] ?? null;
        $recipientType = $body['recipientType'] ?? 'tenant';
        $recipientName = $body['recipientName'] ?? null;
        $recipientId = $body['recipientId'] ?? null;
        
        if (!$mobile || !$message) {
            sendJson(['error' => 'mobile and message are required'], 400);
        }

        $messagingService->logApiRequest('send-sms', [
            'mobile' => $mobile,
            'propertyId' => $propertyId,
            'recipientType' => $recipientType
        ], null, null);
        
        $sentByUserId = $_SESSION['userId'] ?? null;
        $senderShortcode = null;

        // Determine which credentials to use
        if ($recipientType === 'landlord' || !$propertyId) {
            // System SMS (admin→landlord)
            $result = $messagingService->sendSystemSMS($mobile, $message);
            $senderShortcode = getenv('SYSTEM_SMS_SHORTCODE') ?: 'AdvantaSMS';
        } else {
            // Property SMS (landlord→tenant)
            $result = $messagingService->sendPropertySMS($propertyId, $mobile, $message);
            $settings = $messagingService->getPropertySmsSettings($propertyId);
            $senderShortcode = $settings['shortcode'] ?? (getenv('SYSTEM_SMS_SHORTCODE') ?: 'AdvantaSMS');
        }
        
        // Log the message
        $logId = $messagingService->logMessage([
            'channel' => 'sms',
            'recipientContact' => $mobile,
            'status' => $result['success'] ? 'sent' : 'failed',
            'messageCategory' => 'manual',
            'recipientType' => $recipientType,
            'recipientName' => $recipientName,
            'content' => $message,
            'propertyId' => $propertyId,
            'tenantId' => $recipientType === 'tenant' ? $recipientId : null,
            'externalMessageId' => $result['messageId'] ?? null,
            'senderShortcode' => $senderShortcode,
            'sentByUserId' => $sentByUserId
        ]);
        
        if (!$result['success']) {
            $messagingService->updateMessageStatus($logId, 'failed', $result['error']);
        }

        $storage->logActivity([
            'action' => 'SMS Sent',
            'details' => "Manual SMS sent to {$mobile}",
            'type' => 'messaging',
            'status' => $result['success'] ? 'success' : 'error',
            'userId' => $sentByUserId,
            'propertyId' => $propertyId
        ]);

        if ($result['success']) {
            $storage->recordCreditUsage([
                'landlordId' => $propertyId ? null : ($sentByUserId ?? null),
                'propertyId' => $propertyId,
                'channel' => 'sms',
                'units' => 1,
                'meta' => json_encode(['recipient' => $mobile])
            ]);
        }
        
        sendJson([
            'success' => $result['success'],
            'messageId' => $logId,
            'smsResponse' => $result
        ], $result['success'] ? 200 : 500);
    }
    
    // ========== SEND EMAIL (Manual) ==========
    elseif ($endpoint === 'send-email' && $method === 'POST') {
        global $messagingService;
        requireAuth();

        if (empty($body) && !empty($_POST)) {
            $body = $_POST;
        }
        
        $to = $body['to'] ?? null;
        $toName = $body['toName'] ?? null;
        $subject = $body['subject'] ?? null;
        $messageHtml = $body['messageHtml'] ?? null;
        $message = $messageHtml ?? ($body['message'] ?? null);
        $isHtml = filter_var($body['isHtml'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($messageHtml) {
            $isHtml = true;
        }
        $propertyId = $body['propertyId'] ?? null;
        $recipientType = $body['recipientType'] ?? 'tenant';
        $recipientId = $body['recipientId'] ?? null;
        $sentByUserId = $_SESSION['userId'] ?? null;
        
        if (!$to || !$subject || !$message) {
            sendJson(['error' => 'to, subject, and message are required'], 400);
        }
        
        $attachments = [];
        $allowedExtensions = ['pdf', 'csv', 'xlsx', 'zip', 'rar', 'png', 'jpg', 'jpeg'];
        if (!empty($_FILES['attachments'])) {
            $files = $_FILES['attachments'];
            $totalSize = 0;
            if (is_array($files['name'])) {
                foreach ($files['name'] as $index => $name) {
                    if ($files['error'][$index] !== UPLOAD_ERR_OK) {
                        sendJson(['error' => 'Failed to upload attachment'], 400);
                    }
                    $size = $files['size'][$index] ?? 0;
                    $totalSize += $size;
                    if ($totalSize > 10 * 1024 * 1024) {
                        sendJson(['error' => 'Attachments exceed 10MB limit'], 400);
                    }
                    $tmpName = $files['tmp_name'][$index] ?? null;
                    if (!$tmpName || !is_uploaded_file($tmpName)) {
                        sendJson(['error' => 'Invalid attachment upload'], 400);
                    }
                    $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                    if (!in_array($extension, $allowedExtensions, true)) {
                        sendJson(['error' => 'Unsupported attachment type'], 400);
                    }
                    $attachments[] = [
                        'tmp_name' => $tmpName,
                        'name' => $name,
                        'type' => $files['type'][$index] ?? null
                    ];
                }
            } else {
                if ($files['error'] !== UPLOAD_ERR_OK) {
                    sendJson(['error' => 'Failed to upload attachment'], 400);
                }
                $size = $files['size'] ?? 0;
                if ($size > 10 * 1024 * 1024) {
                    sendJson(['error' => 'Attachment exceeds 10MB limit'], 400);
                }
                $tmpName = $files['tmp_name'] ?? null;
                if (!$tmpName || !is_uploaded_file($tmpName)) {
                    sendJson(['error' => 'Invalid attachment upload'], 400);
                }
                $extension = strtolower(pathinfo($files['name'] ?? '', PATHINFO_EXTENSION));
                if (!in_array($extension, $allowedExtensions, true)) {
                    sendJson(['error' => 'Unsupported attachment type'], 400);
                }
                $attachments[] = [
                    'tmp_name' => $tmpName,
                    'name' => $files['name'] ?? 'attachment',
                    'type' => $files['type'] ?? null
                ];
            }
        }
        
        $landlordId = $body['landlordId'] ?? $_SESSION['userId'] ?? null;
        $emailSettings = $storage->getEmailSettings($propertyId, $landlordId);
        if (isset($emailSettings['credit_balance']) && intval($emailSettings['credit_balance']) <= 0) {
            sendJson(['error' => 'Email balance is depleted'], 400);
        }

        $result = $messagingService->sendEmail($to, $toName, $subject, $message, $isHtml, $attachments);
        
        // Log the message
        $logId = $messagingService->logMessage([
            'channel' => 'email',
            'recipientContact' => $to,
            'status' => $result['success'] ? 'sent' : 'failed',
            'messageCategory' => 'manual',
            'recipientType' => $recipientType,
            'recipientName' => $toName,
            'subject' => $subject,
            'content' => $message,
            'propertyId' => $propertyId,
            'tenantId' => $recipientType === 'tenant' ? $recipientId : null,
            'externalMessageId' => $result['messageId'] ?? null,
            'sentByUserId' => $sentByUserId
        ]);
        
        if (!$result['success']) {
            $messagingService->updateMessageStatus($logId, 'failed', $result['error']);
        }

        if ($result['success']) {
            $newBalance = $storage->adjustEmailCreditBalance($propertyId, $landlordId, -1);
            $storage->recordCreditUsage([
                'landlordId' => $landlordId,
                'propertyId' => $propertyId,
                'channel' => 'email',
                'units' => 1,
                'balanceAfter' => $newBalance,
                'meta' => json_encode(['recipient' => $to, 'subject' => $subject])
            ]);
        }

        $storage->logActivity([
            'action' => 'Email Sent',
            'details' => "Manual email sent to {$to}",
            'type' => 'messaging',
            'status' => $result['success'] ? 'success' : 'error',
            'userId' => $sentByUserId,
            'propertyId' => $propertyId
        ]);
        
        sendJson([
            'success' => $result['success'],
            'messageId' => $logId,
            'emailResponse' => $result
        ], $result['success'] ? 200 : 500);
    }

    // ========== CREDIT USAGE ==========
    elseif ($endpoint === 'credit-usage' && $method === 'GET') {
        requireAuth();
        $filters = [
            'propertyId' => getQuery('propertyId'),
            'landlordId' => getQuery('landlordId'),
            'channel' => getQuery('channel')
        ];
        sendJson($storage->getCreditUsage($filters));
    }
    
    // ========== SMS CALLBACK (DLR) ==========
    elseif ($endpoint === 'sms-callback' && in_array($method, ['POST', 'GET', 'HEAD'], true)) {
        // Log incoming callback (provider may send GET/HEAD with query params)
        $callbackData = $body ?: json_decode(file_get_contents('php://input'), true);
        if (empty($callbackData) && $method !== 'POST') {
            $callbackData = $_GET ?? [];
        }
        
        // Expected fields from AdvantaSMS (verify with their docs):
        // message_id, status, to, timestamp, error_code
        $messageId = $callbackData['message_id']
            ?? $callbackData['messageId']
            ?? $callbackData['msg_id']
            ?? $callbackData['messageid']
            ?? $callbackData['message_id']
            ?? $callbackData['id']
            ?? null;
        $status = $callbackData['status']
            ?? $callbackData['delivery_status']
            ?? $callbackData['description']
            ?? $callbackData['state']
            ?? null;
        $errorCode = $callbackData['error_code'] ?? $callbackData['errorCode'] ?? null;
        
        // Log callback for debugging
        global $messagingService;
        $messagingService->logApiRequest('sms-callback', $callbackData, null, null);
        
        if ($messageId && $status && $method !== 'HEAD') {
            // Map AdvantaSMS status to our status
            $ourStatus = 'sent';
            $statusUpper = strtoupper($status);
            if (in_array($statusUpper, ['DELIVRD', 'DELIVERED', 'SUCCESS', 'SUCCESSFUL']) || str_contains($statusUpper, 'DELIVERED')) {
                $ourStatus = 'delivered';
            } elseif (in_array($statusUpper, ['UNDELIV', 'FAILED', 'REJECTD', 'REJECTED', 'FAIL'])) {
                $ourStatus = 'failed';
            } elseif ($statusUpper === 'EXPIRED') {
                $ourStatus = 'expired';
            }
            
            // Update message_recipients table
            global $pdo;
            try {
                $stmt = $pdo->prepare("
                    UPDATE message_recipients 
                    SET status = ?, 
                        delivery_status = ?,
                        delivery_timestamp = NOW(),
                        error_message = ?
                    WHERE external_message_id = ?
                ");
                $stmt->execute([$ourStatus, $status, $errorCode, $messageId]);
                
                // Log successful update
                $messagingService->logApiRequest('sms-callback', $callbackData, ['updated' => true, 'rows_affected' => $stmt->rowCount()], null);
            } catch (Exception $e) {
                error_log("SMS Callback Update Error: " . $e->getMessage());
                $messagingService->logApiRequest('sms-callback', $callbackData, null, $e->getMessage());
            }
        }
        
        // Always return 200 to acknowledge receipt
        sendJson(['success' => true, 'updated' => !empty($messageId) && !empty($status) && $method !== 'HEAD']);
    }
    
    // ========== SMS DLR REFRESH (DB-ONLY) ==========
    elseif ($endpoint === 'sms-dlr-refresh' && $method === 'POST') {
        requireAuth();
        $propertyId = $body['propertyId'] ?? getQuery('propertyId');
        
        global $pdo;
        $sql = "SELECT COUNT(*) as pendingCount
                FROM message_recipients
                WHERE channel = 'sms'
                  AND (delivery_status IS NULL OR delivery_status = '')
                  AND status IN ('sent', 'pending')";
        $params = [];
        if ($propertyId) {
            $sql .= " AND property_id = ?";
            $params[] = $propertyId;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $pendingCount = (int)($stmt->fetch()['pendingCount'] ?? 0);

        $storage->logActivity([
            'action' => 'DLR Refresh',
            'details' => "Checked pending DLRs (count: {$pendingCount})",
            'type' => 'messaging',
            'status' => 'success',
            'userId' => $_SESSION['userId'] ?? null,
            'propertyId' => $propertyId
        ]);
        
        sendJson([
            'success' => true,
            'pendingCount' => $pendingCount,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    // ========== 404 ==========
    else {
        sendJson(['error' => 'Endpoint not found'], 404);
    }
    
} catch (Exception $e) {
    // Log error for debugging
    error_log("API Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    sendJson([
        'error' => $e->getMessage(),
        'endpoint' => $endpoint ?? 'unknown',
        'method' => $method ?? 'unknown'
    ], 500);
} catch (Error $e) {
    // Catch PHP fatal errors
    error_log("API Fatal Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    sendJson([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ], 500);
}

