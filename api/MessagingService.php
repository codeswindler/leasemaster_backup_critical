<?php
/**
 * MessagingService - SMS and Email sending functionality
 * Handles both system messages (admin→landlord) and property messages (landlord→tenant)
 */

require_once __DIR__ . '/config.php';

class MessagingService {
    private $pdo;
    
    // System SMS credentials (from environment)
    private $systemSmsUrl;
    private $systemSmsOtpUrl;
    private $systemSmsBalanceUrl;
    private $systemSmsApiKey;
    private $systemSmsPartnerId;
    private $systemSmsShortcode;
    
    // System Email credentials (from environment)
    private $smtpHost;
    private $smtpPort;
    private $smtpUser;
    private $smtpPass;
    private $emailFrom;
    private $emailFromName;

    public function __construct() {
        global $pdo;
        $this->pdo = $pdo;
        
        // Load system SMS credentials from environment (support legacy keys)
        $smsBaseUrl = getenv('SYSTEM_SMS_BASE_URL') ?: getenv('SMS_API_BASE_URL') ?: null;
        $this->systemSmsUrl = getenv('SYSTEM_SMS_URL') ?: ($smsBaseUrl ? rtrim($smsBaseUrl, '/') . '/api/services/sendsms' : 'https://sms.wicaalinvestments.com/api/services/sendsms');
        $this->systemSmsOtpUrl = getenv('SYSTEM_SMS_OTP_URL') ?: ($smsBaseUrl ? rtrim($smsBaseUrl, '/') . '/api/services/sendotp' : 'https://sms.wicaalinvestments.com/api/services/sendotp');
        $this->systemSmsBalanceUrl = getenv('SYSTEM_SMS_BALANCE_URL') ?: ($smsBaseUrl ? rtrim($smsBaseUrl, '/') . '/api/services/getbalance' : 'https://sms.wicaalinvestments.com/api/services/getbalance');
        $this->systemSmsApiKey = getenv('SYSTEM_SMS_API_KEY') ?: getenv('SMS_API_KEY') ?: '';
        $this->systemSmsPartnerId = getenv('SYSTEM_SMS_PARTNER_ID') ?: getenv('SMS_API_SECRET') ?: '';
        $this->systemSmsShortcode = getenv('SYSTEM_SMS_SHORTCODE') ?: getenv('SMS_SENDER_ID') ?: 'AdvantaSMS';
        
        // Load email credentials from environment
        $this->smtpHost = getenv('SMTP_HOST') ?: 'smtpout.secureserver.net';
        $this->smtpPort = getenv('SMTP_PORT') ?: '465';
        $this->smtpUser = getenv('SMTP_USER') ?: '';
        $this->smtpPass = getenv('SMTP_PASS') ?: '';
        $this->emailFrom = getenv('EMAIL_FROM') ?: $this->smtpUser;
        $this->emailFromName = getenv('EMAIL_FROM_NAME') ?: 'LeaseMaster';
    }

    private function columnExists($table, $column) {
        try {
            $stmt = $this->pdo->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            error_log("Column exists check failed for {$table}.{$column}: " . $e->getMessage());
            return false;
        }
    }

    // ========== SMS FUNCTIONS ==========
    
    /**
     * Send SMS using system credentials (admin→landlord)
     * Used for: login credentials, password resets, OTPs, system alerts
     */
    public function sendSystemSMS($mobile, $message) {
        return $this->sendSMS(
            $mobile, 
            $message, 
            $this->systemSmsUrl,
            $this->systemSmsApiKey,
            $this->systemSmsPartnerId,
            $this->systemSmsShortcode
        );
    }

    /**
     * Send OTP SMS using AdvantaSMS sendotp endpoint
     */
    public function sendSystemOtpSMS($mobile, $message) {
        return $this->sendSMS(
            $mobile,
            $message,
            $this->systemSmsOtpUrl,
            $this->systemSmsApiKey,
            $this->systemSmsPartnerId,
            $this->systemSmsShortcode
        );
    }
    
    /**
     * Send SMS using property credentials (landlord→tenant)
     * Used for: rent reminders, maintenance notices, custom messages
     */
    public function sendPropertySMS($propertyId, $mobile, $message) {
        // Fetch property SMS settings
        $settings = $this->getPropertySmsSettings($propertyId);
        
        if (!$settings || !$settings['enabled']) {
            return [
                'success' => false,
                'error' => 'SMS not configured for this property',
                'code' => 'SMS_NOT_CONFIGURED'
            ];
        }
        
        return $this->sendSMS(
            $mobile,
            $message,
            $settings['api_url'] ?: $this->systemSmsUrl,
            $settings['api_key'],
            $settings['partner_id'],
            $settings['shortcode']
        );
    }
    
    /**
     * Core SMS sending function using AdvantaSMS API
     */
    private function sendSMS($mobile, $message, $apiUrl, $apiKey, $partnerId, $shortcode) {
        // Validate credentials
        if (empty($apiKey) || empty($partnerId)) {
            return [
                'success' => false,
                'error' => 'SMS credentials not configured',
                'code' => 'MISSING_CREDENTIALS'
            ];
        }
        
        // Format phone number (ensure 254 prefix for Kenya)
        $mobile = $this->formatPhoneNumber($mobile);
        
        // Prepare request data
        $postData = [
            'apikey' => $apiKey,
            'partnerID' => $partnerId,
            'message' => $message,
            'shortcode' => $shortcode,
            'mobile' => $mobile
        ];
        
        // Log request
        $this->logApiRequest($apiUrl, $postData, null, null);
        
        // Send request via cURL
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $apiUrl,
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
        
        // Parse response
        $result = json_decode($response, true);
        
        // Log response
        $loggedResponse = $result;
        if (is_array($loggedResponse)) {
            $loggedResponse['_http_code'] = $httpCode;
        }
        $this->logApiRequest($apiUrl, $postData, $loggedResponse, $curlError);
        
        // Handle cURL errors
        if ($curlError) {
            error_log("SMS cURL Error: $curlError");
            return [
                'success' => false,
                'error' => 'Failed to connect to SMS service',
                'curlError' => $curlError,
                'code' => 'CURL_ERROR'
            ];
        }
        
        // Normalize response for success detection
        $responseCode = $result['response-code'] ?? null;
        $messageId = $result['message-id'] ?? null;
        $responseDescription = $result['response-description'] ?? null;
        if (isset($result['responses'][0])) {
            $responseCode = $responseCode ?? ($result['responses'][0]['response-code'] ?? null);
            $messageId = $messageId ?? ($result['responses'][0]['messageid'] ?? ($result['responses'][0]['message-id'] ?? null));
            $responseDescription = $responseDescription ?? ($result['responses'][0]['response-description'] ?? null);
        }

        // Check for success (AdvantaSMS returns response-code 200 on success)
        if ($responseCode == 200) {
            return [
                'success' => true,
                'messageId' => $messageId,
                'response' => $result
            ];
        }
        
        // Handle API errors
        return [
            'success' => false,
            'error' => $responseDescription ?? 'Unknown SMS error',
            'httpCode' => $httpCode,
            'response' => $result,
            'code' => 'API_ERROR'
        ];
    }
    
    /**
     * Get SMS balance for system account
     */
    public function getSystemSmsBalance() {
        return $this->getSmsBalanceWithCredentials(
            $this->systemSmsApiKey,
            $this->systemSmsPartnerId
        );
    }
    
    /**
     * Get SMS balance for a property
     */
    public function getPropertySmsBalance($propertyId) {
        $settings = $this->getPropertySmsSettings($propertyId);
        
        if (!$settings || !$settings['enabled']) {
            return [
                'success' => false,
                'balance' => 0,
                'error' => 'SMS not configured for this property'
            ];
        }
        
        return $this->getSmsBalanceWithCredentials($settings['api_key'], $settings['partner_id']);
    }
    
    /**
     * Get SMS balance from AdvantaSMS
     */
    public function getSmsBalanceWithCredentials($apiKey, $partnerId) {
        if (empty($apiKey) || empty($partnerId)) {
            return [
                'success' => false,
                'balance' => 0,
                'error' => 'SMS credentials not configured'
            ];
        }
        
        $url = $this->systemSmsBalanceUrl ?: 'https://sms.wicaalinvestments.com/api/services/getbalance/';
        
        $postData = [
            'apikey' => $apiKey,
            'partnerID' => $partnerId
        ];
        
        // Log request
        $this->logApiRequest($url, $postData, null, null);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
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
        
        // Parse response
        $result = json_decode($response, true);
        
        // Log response
        $loggedResponse = $result;
        if (is_array($loggedResponse)) {
            $loggedResponse['_http_code'] = $httpCode;
        }
        $this->logApiRequest($url, $postData, $loggedResponse, $curlError);
        
        if ($curlError) {
            return [
                'success' => false,
                'balance' => 0,
                'error' => 'Failed to fetch balance'
            ];
        }
        
        if (isset($result['credit'])) {
            return [
                'success' => true,
                'balance' => floatval($result['credit']),
                'response' => $result
            ];
        }
        
        return [
            'success' => false,
            'balance' => 0,
            'error' => $result['response-description'] ?? 'Unknown error'
        ];
    }
    
    // ========== EMAIL FUNCTIONS ==========
    
    /**
     * Send email using GoDaddy SMTP
     */
    public function sendEmail($to, $toName, $subject, $body, $isHtml = true, $attachments = []) {
        // Validate credentials
        if (empty($this->smtpUser) || empty($this->smtpPass)) {
            return [
                'success' => false,
                'error' => 'Email credentials not configured',
                'code' => 'MISSING_CREDENTIALS'
            ];
        }
        
        // Use PHPMailer if available, otherwise use mail() function
        if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
            return $this->sendEmailWithPhpMailer($to, $toName, $subject, $body, $isHtml, $attachments);
        } else {
            return $this->sendEmailWithSmtp($to, $toName, $subject, $body, $isHtml, $attachments);
        }
    }
    
    /**
     * Send email using native PHP SMTP
     */
    private function sendEmailWithSmtp($to, $toName, $subject, $body, $isHtml, $attachments = []) {
        if (!empty($attachments)) {
            return [
                'success' => false,
                'error' => 'Attachments require PHPMailer',
                'code' => 'ATTACHMENTS_NOT_SUPPORTED'
            ];
        }
        // Build headers
        $headers = [];
        $headers[] = "MIME-Version: 1.0";
        $headers[] = $isHtml ? "Content-Type: text/html; charset=UTF-8" : "Content-Type: text/plain; charset=UTF-8";
        $headers[] = "From: {$this->emailFromName} <{$this->emailFrom}>";
        $headers[] = "Reply-To: {$this->emailFrom}";
        $headers[] = "X-Mailer: LeaseMaster";
        
        $toAddress = empty($toName) ? $to : "{$toName} <{$to}>";
        
        // Use mail() function with SMTP ini settings
        ini_set('SMTP', $this->smtpHost);
        ini_set('smtp_port', $this->smtpPort);
        
        $success = @mail($toAddress, $subject, $body, implode("\r\n", $headers));
        
        if ($success) {
            return [
                'success' => true,
                'messageId' => uniqid('email_')
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to send email',
                'code' => 'MAIL_FAILED'
            ];
        }
    }
    
    /**
     * Send email using PHPMailer (if installed)
     */
    private function sendEmailWithPhpMailer($to, $toName, $subject, $body, $isHtml, $attachments = []) {
        try {
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            
            // SMTP settings
            $mail->isSMTP();
            $mail->Host = $this->smtpHost;
            $mail->SMTPAuth = true;
            $mail->Username = $this->smtpUser;
            $mail->Password = $this->smtpPass;
            $mail->SMTPSecure = $this->smtpPort == '465' ? 'ssl' : 'tls';
            $mail->Port = intval($this->smtpPort);
            
            // Sender and recipient
            $mail->setFrom($this->emailFrom, $this->emailFromName);
            $mail->addAddress($to, $toName);
            
            // Content
            $mail->isHTML($isHtml);
            $mail->Subject = $subject;
            $mail->Body = $body;
            
            if ($isHtml) {
                $mail->AltBody = strip_tags($body);
            }

            foreach ($attachments as $attachment) {
                if (!empty($attachment['tmp_name'])) {
                    $mail->addAttachment($attachment['tmp_name'], $attachment['name'] ?? 'attachment');
                }
            }
            
            $mail->send();
            
            return [
                'success' => true,
                'messageId' => $mail->getLastMessageID() ?: uniqid('email_')
            ];
        } catch (\Exception $e) {
            error_log("Email Error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to send email: ' . $e->getMessage(),
                'code' => 'PHPMAILER_ERROR'
            ];
        }
    }
    
    // ========== MESSAGE LOGGING ==========
    
    /**
     * Log a system message to the database
     */
    public function logMessage($data) {
        $id = $this->generateUUID();

        $columns = [];
        $placeholders = [];
        $values = [];

        $addColumn = function ($column, $value, $useNow = false) use (&$columns, &$placeholders, &$values) {
            $columns[] = $column;
            if ($useNow) {
                $placeholders[] = "NOW()";
            } else {
                $placeholders[] = "?";
                $values[] = $value;
            }
        };

        $addColumn('id', $id);
        $addColumn('bulk_message_id', $data['bulkMessageId'] ?? null);
        $addColumn('tenant_id', $data['tenantId'] ?? null);
        $addColumn('channel', $data['channel']);
        $addColumn('recipient_contact', $data['recipientContact']);
        $addColumn('status', $data['status'] ?? 'sent');

        if ($this->columnExists('message_recipients', 'message_category')) {
            $addColumn('message_category', $data['messageCategory'] ?? 'manual');
        }
        if ($this->columnExists('message_recipients', 'recipient_type')) {
            $addColumn('recipient_type', $data['recipientType'] ?? 'tenant');
        }
        if ($this->columnExists('message_recipients', 'recipient_name')) {
            $addColumn('recipient_name', $data['recipientName'] ?? null);
        }
        if ($this->columnExists('message_recipients', 'subject')) {
            $addColumn('subject', $data['subject'] ?? null);
        }
        if ($this->columnExists('message_recipients', 'content')) {
            $addColumn('content', $data['content'] ?? null);
        }
        if ($this->columnExists('message_recipients', 'property_id')) {
            $addColumn('property_id', $data['propertyId'] ?? null);
        }
        if ($this->columnExists('message_recipients', 'external_message_id')) {
            $addColumn('external_message_id', $data['externalMessageId'] ?? null);
        }
        if ($this->columnExists('message_recipients', 'sender_shortcode')) {
            $addColumn('sender_shortcode', $data['senderShortcode'] ?? null);
        }
        if ($this->columnExists('message_recipients', 'sent_by_user_id')) {
            $addColumn('sent_by_user_id', $data['sentByUserId'] ?? null);
        }
        if ($this->columnExists('message_recipients', 'sent_at')) {
            $addColumn('sent_at', null, true);
        }
        if ($this->columnExists('message_recipients', 'created_at')) {
            $addColumn('created_at', null, true);
        }

        $sql = "INSERT INTO message_recipients (" . implode(', ', $columns) . ")
                VALUES (" . implode(', ', $placeholders) . ")";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $id;
    }
    
    /**
     * Update message status
     */
    public function updateMessageStatus($id, $status, $errorMessage = null) {
        $sql = "UPDATE message_recipients SET status = ?, error_message = ?";
        
        if ($status === 'delivered') {
            $sql .= ", delivered_at = NOW()";
        }
        
        $sql .= " WHERE id = ?";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$status, $errorMessage, $id]);
    }
    
    // ========== PROPERTY SMS SETTINGS ==========
    
    public function getPropertySmsSettings($propertyId) {
        $stmt = $this->pdo->prepare("SELECT * FROM property_sms_settings WHERE property_id = ?");
        $stmt->execute([$propertyId]);
        return $stmt->fetch();
    }
    
    public function savePropertySmsSettings($propertyId, $data) {
        // Check if settings exist
        $existing = $this->getPropertySmsSettings($propertyId);
        
        if ($existing) {
            // Update
            $sql = "UPDATE property_sms_settings 
                    SET api_url = ?, api_key = ?, partner_id = ?, shortcode = ?, enabled = ?, updated_at = NOW()
                    WHERE property_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $data['apiUrl'] ?? $this->systemSmsUrl,
                $data['apiKey'] ?? null,
                $data['partnerId'] ?? null,
                $data['shortcode'] ?? null,
                $data['enabled'] ? 1 : 0,
                $propertyId
            ]);
            return $this->getPropertySmsSettings($propertyId);
        } else {
            // Insert
            $id = $this->generateUUID();
            $sql = "INSERT INTO property_sms_settings 
                    (id, property_id, api_url, api_key, partner_id, shortcode, enabled, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $id,
                $propertyId,
                $data['apiUrl'] ?? $this->systemSmsUrl,
                $data['apiKey'] ?? null,
                $data['partnerId'] ?? null,
                $data['shortcode'] ?? null,
                $data['enabled'] ? 1 : 0
            ]);
            return $this->getPropertySmsSettings($propertyId);
        }
    }
    
    // ========== HELPER FUNCTIONS ==========
    
    /**
     * Format phone number for Kenya (254 prefix)
     */
    private function formatPhoneNumber($phone) {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Handle different formats
        if (strlen($phone) === 9) {
            // Missing country code: 712345678 -> 254712345678
            return '254' . $phone;
        } elseif (strlen($phone) === 10 && substr($phone, 0, 1) === '0') {
            // Local format: 0712345678 -> 254712345678
            return '254' . substr($phone, 1);
        } elseif (strlen($phone) === 12 && substr($phone, 0, 3) === '254') {
            // Already correct: 254712345678
            return $phone;
        } elseif (strlen($phone) === 13 && substr($phone, 0, 4) === '+254') {
            // With + prefix: +254712345678 -> 254712345678
            return substr($phone, 1);
        }
        
        return $phone;
    }
    
    /**
     * Log API request/response for debugging
     */
    public function logApiRequest($endpoint, $request, $response, $error = null) {
        date_default_timezone_set('Africa/Nairobi');
        $logDate = date('Y-m-d');
        $logFile = __DIR__ . "/logs/sms_api-{$logDate}.log";
        $logDir = dirname($logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        $safeRequest = $request;
        if (is_array($safeRequest)) {
            if (!empty($safeRequest['apikey'])) {
                $apiKey = (string)$safeRequest['apikey'];
                $safeRequest['apikey'] = substr($apiKey, 0, 4) . '***' . substr($apiKey, -4);
            }
            if (!empty($safeRequest['message'])) {
                $safeRequest['message_length'] = strlen((string)$safeRequest['message']);
            }
        }

        $entry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => $endpoint,
            'request' => $safeRequest,
            'response' => $response,
            'error' => $error
        ];
        
        file_put_contents($logFile, json_encode($entry) . "\n", FILE_APPEND);
    }
    
    private function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}

// Create global instance
$messagingService = new MessagingService();
