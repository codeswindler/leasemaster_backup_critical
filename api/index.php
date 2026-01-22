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
            
            // Successful login - reset login attempts and update status (security feature)
            $storage->recordSuccessfulLogin($user['id']);
            
            // Set session
            $_SESSION['userId'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            
            // Get updated user data with role
            $updatedUser = $storage->getUser($user['id']);
            
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
                    'role' => $updatedUser['role'] ?? 'client',
                    'mustChangePassword' => $mustChangePassword
                ]
            ]);
        }
        
        if ($action === 'check' && $method === 'GET') {
            if (isset($_SESSION['userId'])) {
                $user = $storage->getUser($_SESSION['userId']);
                if ($user) {
                    // Ensure role is always returned (default to 'client' if missing)
                    $userRole = $user['role'] ?? 'client';
                    
                    // Log warning if role is missing (shouldn't happen but helps debug)
                    if (empty($user['role'])) {
                        error_log("Warning: User {$user['id']} has no role in database - defaulting to 'client'");
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
                            'mustChangePassword' => $mustChangePassword
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
            if (isset($_SESSION['userId'])) {
                $user = $storage->getUser($_SESSION['userId']);
                $userRole = $user['role'] ?? 'client';
            }
            
            // Admin and super_admin users see all properties (bypass filter)
            if ($userRole === 'admin' || $userRole === 'super_admin') {
                sendJson($storage->getAllProperties());
            } else {
                // Client users: filter by landlordId if provided
                sendJson($storage->getAllProperties($landlordId, $propertyId));
            }
        }
        
        if ($method === 'GET' && $id) {
            if ($action === 'disable' && $method === 'POST') {
                $property = $storage->disableProperty($id);
                sendJson($property ?: ['error' => 'Property not found'], $property ? 200 : 404);
            }
            if ($action === 'enable' && $method === 'POST') {
                $property = $storage->enableProperty($id);
                sendJson($property ?: ['error' => 'Property not found'], $property ? 200 : 404);
            }
            $property = $storage->getProperty($id);
            if (!$property) {
                sendJson([
                    'error' => 'Property not found',
                    'message' => 'The property may have been deleted or does not exist. Please refresh the page.'
                ], 404);
            } else {
                sendJson($property, 200);
            }
        }
        
        if ($method === 'POST') {
            try {
                $property = $storage->createProperty($body);
                sendJson($property, 201);
            } catch (Exception $e) {
                sendJson(['error' => $e->getMessage()], 400);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $property = $storage->updateProperty($id, $body);
            sendJson($property ?: ['error' => 'Property not found'], $property ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteProperty($id);
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
            $password = $result['password'] ?? 'Your existing password';
            $isNewPassword = isset($result['password']);
            
            // Build SMS message
            $smsMessage = "LeaseMaster Login Credentials\n";
            $smsMessage .= "Username: {$username}\n";
            if ($isNewPassword) {
                $smsMessage .= "Password: {$password}\n";
                $smsMessage .= "Please change your password after first login.";
            } else {
                $smsMessage .= "Use your existing password to login.";
            }
            
            // Build Email message
            $emailSubject = $isNewPassword ? "Your LeaseMaster Login Credentials" : "LeaseMaster Login Reminder";
            $emailBody = "<html><body>";
            $emailBody .= "<h2>LeaseMaster Login Credentials</h2>";
            $emailBody .= "<p>Hello,</p>";
            $emailBody .= "<p>Here are your login credentials for the LeaseMaster portal:</p>";
            $emailBody .= "<table style='border-collapse: collapse;'>";
            $emailBody .= "<tr><td style='padding: 8px; border: 1px solid #ddd;'><strong>Username:</strong></td><td style='padding: 8px; border: 1px solid #ddd;'>{$username}</td></tr>";
            if ($isNewPassword) {
                $emailBody .= "<tr><td style='padding: 8px; border: 1px solid #ddd;'><strong>Password:</strong></td><td style='padding: 8px; border: 1px solid #ddd;'>{$password}</td></tr>";
            }
            $emailBody .= "</table>";
            if ($isNewPassword) {
                $emailBody .= "<p><strong>Important:</strong> Please change your password after your first login.</p>";
            }
            $emailBody .= "<p>Login at: <a href='https://portal.theleasemaster.com'>portal.theleasemaster.com</a></p>";
            $emailBody .= "<p>Best regards,<br>LeaseMaster Team</p>";
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
            sendJson($storage->getLandlords());
        }
        
        if ($method === 'GET' && $id && !$action) {
            $landlord = $storage->getLandlord($id);
            sendJson($landlord ?: ['error' => 'Landlord not found'], $landlord ? 200 : 404);
        }
        
        if ($method === 'POST' && !$id) {
            try {
                $landlord = $storage->createLandlord($body);
                // Verify landlord was actually created in database
                $verifyLandlord = $storage->getLandlord($landlord['id']);
                if (!$verifyLandlord) {
                    throw new Exception('Landlord creation failed - user not found in database after creation');
                }
                sendJson($landlord, 201);
            } catch (Exception $e) {
                sendJson(['error' => $e->getMessage()], 400);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $landlord = $storage->updateLandlord($id, $body);
            sendJson($landlord ?: ['error' => 'Landlord not found'], $landlord ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteLandlord($id);
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== HOUSE TYPES ==========
    elseif ($endpoint === 'house-types') {
        if ($method === 'GET' && !$id) {
            $houseTypes = $storage->getAllHouseTypes();
            $propertyId = getQuery('propertyId');
            if ($propertyId) {
                $houseTypes = array_filter($houseTypes, function($ht) use ($propertyId) {
                    return $ht['property_id'] === $propertyId;
                });
            }
            sendJson(array_values($houseTypes));
        }
        
        if ($method === 'GET' && $id) {
            $houseType = $storage->getHouseType($id);
            sendJson($houseType ?: ['error' => 'House type not found'], $houseType ? 200 : 404);
        }
        
        if ($method === 'POST') {
            $houseType = $storage->createHouseType($body);
            sendJson($houseType, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $houseType = $storage->updateHouseType($id, $body);
            sendJson($houseType ?: ['error' => 'House type not found'], $houseType ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteHouseType($id);
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== UNITS ==========
    elseif ($endpoint === 'units') {
        if ($method === 'GET' && !$id) {
            $propertyId = getQuery('propertyId');
            if ($propertyId) {
                sendJson($storage->getUnitsByProperty($propertyId));
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
                sendJson(['success' => $success, 'failed' => $failed]);
            } else {
                $unit = $storage->createUnit($body);
                sendJson($unit, 201);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $unit = $storage->updateUnit($id, $body);
            sendJson($unit ?: ['error' => 'Unit not found'], $unit ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteUnit($id);
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== TENANTS ==========
    elseif ($endpoint === 'tenants') {
        if ($method === 'GET' && !$id) {
            sendJson($storage->getAllTenants());
        }
        
        if ($method === 'GET' && $id) {
            $tenant = $storage->getTenant($id);
            sendJson($tenant ?: ['error' => 'Tenant not found'], $tenant ? 200 : 404);
        }
        
        if ($method === 'POST') {
            $tenant = $storage->createTenant($body);
            sendJson($tenant, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $tenant = $storage->updateTenant($id, $body);
            sendJson($tenant ?: ['error' => 'Tenant not found'], $tenant ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteTenant($id);
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
            sendJson($lease, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $lease = $storage->updateLease($id, $body);
            sendJson($lease ?: ['error' => 'Lease not found'], $lease ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteLease($id);
            sendJson([], $success ? 204 : 404);
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
                sendJson(['message' => "Generated " . count($invoices) . " invoices for $month/$year", 'invoices' => $invoices]);
            } else {
                $invoice = $storage->createInvoice($body);
                sendJson($invoice, 201);
            }
        }
        
        if ($method === 'PUT' && $id) {
            $invoice = $storage->updateInvoice($id, $body);
            sendJson($invoice ?: ['error' => 'Invoice not found'], $invoice ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteInvoice($id);
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
            sendJson($payment, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $payment = $storage->updatePayment($id, $body);
            sendJson($payment ?: ['error' => 'Payment not found'], $payment ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deletePayment($id);
            sendJson([], $success ? 204 : 404);
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
                
                sendJson($results);
            } elseif ($bulkMessageId) {
                sendJson($storage->getMessageRecipientsByBulkMessage($bulkMessageId));
            } elseif ($tenantId) {
                sendJson($storage->getMessageRecipientsByTenant($tenantId));
            } else {
                sendJson($storage->getAllMessageRecipients());
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
    
    // ========== ACTIVITY LOGS ==========
    elseif ($endpoint === 'activity-logs') {
        requireAuth();
        if ($method === 'GET') {
            $filters = [
                'type' => getQuery('type'),
                'userId' => getQuery('userId'),
                'propertyId' => getQuery('propertyId'),
                'search' => getQuery('search'),
                'dateFrom' => getQuery('dateFrom'),
                'dateTo' => getQuery('dateTo')
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
            sendJson($reading, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $reading = $storage->updateWaterReading($id, $body);
            sendJson($reading ?: ['error' => 'Water reading not found'], $reading ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteWaterReading($id);
            sendJson([], $success ? 204 : 404);
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
            $chargeCode = $storage->createChargeCode($body);
            sendJson($chargeCode, 201);
        }
        
        if ($method === 'PUT' && $id) {
            $chargeCode = $storage->updateChargeCode($id, $body);
            sendJson($chargeCode ?: ['error' => 'Charge code not found'], $chargeCode ? 200 : 404);
        }
        
        if ($method === 'DELETE' && $id) {
            $success = $storage->deleteChargeCode($id);
            sendJson([], $success ? 204 : 404);
        }
    }
    
    // ========== STATS ==========
    elseif ($endpoint === 'stats' && $method === 'GET') {
        sendJson($storage->getPropertyStats());
    }
    
    // ========== USERS ==========
    elseif ($endpoint === 'users' && $method === 'GET') {
        sendJson($storage->getUsers());
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
        
        $to = $body['to'] ?? null;
        $toName = $body['toName'] ?? null;
        $subject = $body['subject'] ?? null;
        $message = $body['message'] ?? null;
        $propertyId = $body['propertyId'] ?? null;
        $recipientType = $body['recipientType'] ?? 'tenant';
        $recipientId = $body['recipientId'] ?? null;
        $sentByUserId = $_SESSION['userId'] ?? null;
        
        if (!$to || !$subject || !$message) {
            sendJson(['error' => 'to, subject, and message are required'], 400);
        }
        
        $result = $messagingService->sendEmail($to, $toName, $subject, $message);
        
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
    
    // ========== SMS CALLBACK (DLR) ==========
    elseif ($endpoint === 'sms-callback' && $method === 'POST') {
        // Log incoming callback
        $callbackData = $body ?: json_decode(file_get_contents('php://input'), true);
        
        // Expected fields from AdvantaSMS (verify with their docs):
        // message_id, status, to, timestamp, error_code
        $messageId = $callbackData['message_id'] ?? $callbackData['messageId'] ?? $callbackData['msg_id'] ?? $callbackData['messageid'] ?? null;
        $status = $callbackData['status'] ?? $callbackData['delivery_status'] ?? $callbackData['description'] ?? null;
        $errorCode = $callbackData['error_code'] ?? $callbackData['errorCode'] ?? null;
        
        // Log callback for debugging
        global $messagingService;
        $messagingService->logApiRequest('sms-callback', $callbackData, null, null);
        
        if ($messageId && $status) {
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
        sendJson(['success' => true]);
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

