<?php
/**
 * Storage Class - Database Operations
 * Converted from TypeScript storage.ts
 */

require_once __DIR__ . '/config.php';

class Storage {
    private $pdo;

    public function __construct() {
        global $pdo;
        $this->pdo = $pdo;
    }

    // Helper: Generate UUID
    private function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    // Helper: Get database type
    private function getDbType() {
        $driver = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        return $driver;
    }
    
    // Helper: Check if column exists (MariaDB/MySQL only)
    private function columnExists($table, $column) {
        // PRODUCTION: MariaDB/MySQL only - use SHOW COLUMNS syntax
        try {
            $stmt = $this->pdo->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            // Fallback: use information_schema if SHOW COLUMNS fails
            try {
                $stmt = $this->pdo->prepare("
                    SELECT COUNT(*) as count 
                    FROM information_schema.columns 
                    WHERE table_schema = DATABASE()
                    AND table_name = ? AND column_name = ?
                ");
                $stmt->execute([$table, $column]);
                $result = $stmt->fetch();
                return $result['count'] > 0;
            } catch (Exception $e2) {
                error_log("Error checking column existence: " . $e2->getMessage());
                return false;
            }
        }
    }
    
    // Helper: Check if table exists (MariaDB/MySQL only)
    private function tableExists($table) {
        try {
            $stmt = $this->pdo->query("SHOW TABLES LIKE '{$table}'");
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            try {
                $stmt = $this->pdo->prepare("
                    SELECT COUNT(*) as count
                    FROM information_schema.tables
                    WHERE table_schema = DATABASE()
                    AND table_name = ?
                ");
                $stmt->execute([$table]);
                $result = $stmt->fetch();
                return $result['count'] > 0;
            } catch (Exception $e2) {
                error_log("Error checking table existence: " . $e2->getMessage());
                return false;
            }
        }
    }
    
    // Test database connection
    public function testConnection() {
        try {
            $stmt = $this->pdo->query("SELECT 1");
            return $stmt !== false;
        } catch (Exception $e) {
            error_log("Database connection test failed: " . $e->getMessage());
            return false;
        }
    }
    
    // Helper: Update unit status based on active leases
    private function updateUnitStatusFromLeases($unitId) {
        $dbType = $this->getDbType();
        $currentDateFunc = ($dbType === 'pgsql') ? 'CURRENT_DATE' : 'CURDATE()';
        
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as count FROM leases 
            WHERE unit_id = ? 
            AND status = 'active' 
            AND start_date <= {$currentDateFunc} 
            AND end_date >= {$currentDateFunc}
        ");
        $stmt->execute([$unitId]);
        $result = $stmt->fetch();
        
        $status = ($result['count'] > 0) ? 'occupied' : 'vacant';
        
        $updateStmt = $this->pdo->prepare("UPDATE units SET status = ? WHERE id = ?");
        $updateStmt->execute([$status, $unitId]);
    }

    // ========== USERS ==========
    public function getUser($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getUserByUsername($username) {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        return $stmt->fetch();
    }

    // ========== LOGIN OTP ==========
    public function getLatestLoginOtp($userId = null, $tenantId = null) {
        if (!$this->tableExists('login_otps')) {
            return null;
        }
        if (!$userId && !$tenantId) {
            return null;
        }
        $sql = "SELECT * FROM login_otps WHERE ";
        $params = [];
        if ($userId) {
            $sql .= "user_id = ?";
            $params[] = $userId;
        } else {
            $sql .= "tenant_id = ?";
            $params[] = $tenantId;
        }
        $sql .= " ORDER BY last_sent_at DESC LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }

    public function getLoginOtp($otpId) {
        if (!$this->tableExists('login_otps')) {
            return null;
        }
        $stmt = $this->pdo->prepare("SELECT * FROM login_otps WHERE id = ?");
        $stmt->execute([$otpId]);
        return $stmt->fetch();
    }

    public function createLoginOtp($userId, $tenantId, $codeHash, $expiresAt) {
        if (!$this->tableExists('login_otps')) {
            return null;
        }
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare(
            "INSERT INTO login_otps (id, user_id, tenant_id, code_hash, expires_at, last_sent_at)
             VALUES (?, ?, ?, ?, ?, NOW())"
        );
        $stmt->execute([
            $id,
            $userId,
            $tenantId,
            $codeHash,
            $expiresAt
        ]);
        return $id;
    }

    public function markLoginOtpUsed($otpId) {
        if (!$this->tableExists('login_otps')) {
            return false;
        }
        $stmt = $this->pdo->prepare("UPDATE login_otps SET used_at = NOW() WHERE id = ?");
        $stmt->execute([$otpId]);
        return $stmt->rowCount() > 0;
    }

    public function getUsers($filters = []) {
        $hasPropertyId = $this->columnExists('users', 'property_id');
        $hasLandlordId = $this->columnExists('properties', 'landlord_id');
        $hasRole = $this->columnExists('users', 'role');

        $where = [];
        $params = [];

        if (!empty($filters['propertyId']) && $hasPropertyId) {
            if (!empty($filters['landlordId'])) {
                $where[] = "(u.property_id = ? OR u.id = ?)";
                $params[] = $filters['propertyId'];
                $params[] = $filters['landlordId'];
            } else {
                $where[] = "u.property_id = ?";
                $params[] = $filters['propertyId'];
            }
        } elseif (!empty($filters['landlordId']) && $hasLandlordId && $hasPropertyId) {
            $where[] = "(p.landlord_id = ? OR u.id = ?)";
            $params[] = $filters['landlordId'];
            $params[] = $filters['landlordId'];
        }
        if (!empty($filters['landlordId']) && $hasRole) {
            $where[] = "(u.role IS NULL OR u.role <> 'admin' OR u.id = ?)";
            $params[] = $filters['landlordId'];
            $where[] = "(u.role IS NULL OR u.role <> 'client' OR u.id = ?)";
            $params[] = $filters['landlordId'];
        }

        $sql = "SELECT u.* FROM users u";
        if (!empty($filters['landlordId']) && $hasLandlordId && $hasPropertyId) {
            $sql .= " LEFT JOIN properties p ON u.property_id = p.id";
        }
        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function createUser($data) {
        $id = $this->generateUUID();
        $role = $data['role'] ?? 'client';  // Default role is 'client'
        $status = 4;  // Initial status (user hasn't logged in yet)
        $password = $data['password'] ?? '';
        if ($password && strpos($password, '$2') !== 0) {
            $password = password_hash($password, PASSWORD_BCRYPT);
        }
        
        // Check which columns exist (for backward compatibility)
        $hasStatus = $this->columnExists('users', 'status');
        $hasLoginAttempts = $this->columnExists('users', 'login_attempts');
        $hasFullName = $this->columnExists('users', 'full_name');
        $hasPhone = $this->columnExists('users', 'phone');
        $hasIdNumber = $this->columnExists('users', 'id_number');
        $hasPropertyId = $this->columnExists('users', 'property_id');
        $hasPermissions = $this->columnExists('users', 'permissions');
        $hasOtpEnabled = $this->columnExists('users', 'otp_enabled');
        $hasPropertyLimit = $this->columnExists('users', 'property_limit');
        $hasAlertsEnabled = $this->columnExists('users', 'alerts_enabled');
        
        $columns = ['id', 'username', 'password', 'role'];
        $values = [$id, $data['username'], $password, $role];
        
        if ($hasStatus) {
            $columns[] = 'status';
            $values[] = $status;
        }
        if ($hasLoginAttempts) {
            $columns[] = 'login_attempts';
            $values[] = 0;
        }
        if ($hasFullName && isset($data['fullName'])) {
            $columns[] = 'full_name';
            $values[] = $data['fullName'];
        }
        if ($hasPhone && isset($data['phone'])) {
            $columns[] = 'phone';
            $values[] = $data['phone'];
        }
        if ($hasIdNumber && isset($data['idNumber'])) {
            $columns[] = 'id_number';
            $values[] = $data['idNumber'];
        }
        if ($hasPropertyId && isset($data['propertyId'])) {
            $columns[] = 'property_id';
            $values[] = $data['propertyId'];
        }
        if ($hasPermissions && isset($data['permissions'])) {
            $columns[] = 'permissions';
            $values[] = is_array($data['permissions']) ? json_encode($data['permissions']) : $data['permissions'];
        }
        if ($hasOtpEnabled && isset($data['otpEnabled'])) {
            $columns[] = 'otp_enabled';
            $values[] = $data['otpEnabled'] ? 1 : 0;
        }
        if ($hasAlertsEnabled && array_key_exists('alertsEnabled', $data)) {
            $columns[] = 'alerts_enabled';
            $values[] = $data['alertsEnabled'] ? 1 : 0;
        }
        if ($hasPropertyLimit && array_key_exists('propertyLimit', $data)) {
            $columns[] = 'property_limit';
            $values[] = $data['propertyLimit'];
        }
        
        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $sql = "INSERT INTO users (" . implode(', ', $columns) . ") VALUES (" . $placeholders . ")";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        return $this->getUser($id);
    }

    public function updateUser($id, $data) {
        $existing = $this->getUser($id);
        if (!$existing) return null;

        $fields = [];
        $values = [];

        $mapping = [
            'username' => 'username',
            'role' => 'role',
        ];

        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }

        if (isset($data['password'])) {
            $password = $data['password'];
            if ($password && strpos($password, '$2') !== 0) {
                $password = password_hash($password, PASSWORD_BCRYPT);
            }
            $fields[] = "password = ?";
            $values[] = $password;
        }

        if (isset($data['fullName']) && $this->columnExists('users', 'full_name')) {
            $fields[] = "full_name = ?";
            $values[] = $data['fullName'];
        }
        if (isset($data['phone']) && $this->columnExists('users', 'phone')) {
            $fields[] = "phone = ?";
            $values[] = $data['phone'];
        }
        if (isset($data['idNumber']) && $this->columnExists('users', 'id_number')) {
            $fields[] = "id_number = ?";
            $values[] = $data['idNumber'];
        }
        if (array_key_exists('propertyLimit', $data) && $this->columnExists('users', 'property_limit')) {
            $fields[] = "property_limit = ?";
            $values[] = $data['propertyLimit'];
        }
        if (isset($data['propertyId']) && $this->columnExists('users', 'property_id')) {
            $fields[] = "property_id = ?";
            $values[] = $data['propertyId'];
        }
        if (isset($data['permissions']) && $this->columnExists('users', 'permissions')) {
            $fields[] = "permissions = ?";
            $values[] = is_array($data['permissions']) ? json_encode($data['permissions']) : $data['permissions'];
        }
        if (isset($data['otpEnabled']) && $this->columnExists('users', 'otp_enabled')) {
            $fields[] = "otp_enabled = ?";
            $values[] = $data['otpEnabled'] ? 1 : 0;
        }
        if (array_key_exists('alertsEnabled', $data) && $this->columnExists('users', 'alerts_enabled')) {
            $fields[] = "alerts_enabled = ?";
            $values[] = $data['alertsEnabled'] ? 1 : 0;
        }
        if (isset($data['status']) && $this->columnExists('users', 'status')) {
            $fields[] = "status = ?";
            $values[] = $data['status'];
        }
        if (isset($data['mustChangePassword']) && $this->columnExists('users', 'must_change_password')) {
            $fields[] = "must_change_password = ?";
            $values[] = $data['mustChangePassword'] ? 1 : 0;
        }

        if (empty($fields)) return $existing;

        $values[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        return $this->getUser($id);
    }

    public function deleteUser($id) {
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function setUserPassword($id, $hashedPassword, $mustChangePassword = null) {
        $fields = ["password = ?"];
        $values = [$hashedPassword];
        if ($mustChangePassword !== null && $this->columnExists('users', 'must_change_password')) {
            $fields[] = "must_change_password = ?";
            $values[] = $mustChangePassword ? 1 : 0;
        }
        $values[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        return $stmt->rowCount() > 0;
    }

    // ========== SECURITY METHODS ==========
    public function recordFailedLoginAttempt($userId, $attempts) {
        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET login_attempts = ?, last_failed_attempt = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        $stmt->execute([$attempts, $userId]);
    }

    public function recordSuccessfulLogin($userId) {
        // Check if status column exists
        $hasStatus = $this->columnExists('users', 'status');
        
        // Check if last_login column exists
        $hasLastLogin = $this->columnExists('users', 'last_login');
        
        if ($hasStatus && $hasLastLogin) {
            // Both columns exist - update all fields
            $stmt = $this->pdo->prepare("
                UPDATE users 
                SET login_attempts = 0, status = 1, last_failed_attempt = NULL, last_login = CURRENT_TIMESTAMP 
                WHERE id = ?
            ");
            $stmt->execute([$userId]);
        } elseif ($hasStatus) {
            // Only status column exists
            $stmt = $this->pdo->prepare("
                UPDATE users 
                SET login_attempts = 0, status = 1, last_failed_attempt = NULL 
                WHERE id = ?
            ");
            $stmt->execute([$userId]);
        } elseif ($hasLastLogin) {
            // Only last_login column exists
            $stmt = $this->pdo->prepare("
                UPDATE users 
                SET login_attempts = 0, last_failed_attempt = NULL, last_login = CURRENT_TIMESTAMP 
                WHERE id = ?
            ");
            $stmt->execute([$userId]);
        } else {
            // Fallback: just reset attempts if neither column exists yet
            $stmt = $this->pdo->prepare("
                UPDATE users 
                SET login_attempts = 0 
                WHERE id = ?
            ");
            $stmt->execute([$userId]);
        }
    }

    public function blockUser($userId, $blockedUntil) {
        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET status = 2, blocked_until = ? 
            WHERE id = ?
        ");
        $stmt->execute([$blockedUntil, $userId]);
    }

    public function unblockUser($userId) {
        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET status = 1, login_attempts = 0, blocked_until = NULL, last_failed_attempt = NULL 
            WHERE id = ?
        ");
        $stmt->execute([$userId]);
    }

    // ========== LANDLORDS ==========
    public function getLandlords() {
        $stmt = $this->pdo->query("SELECT * FROM users WHERE role = 'client' ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getLandlord($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = ? AND role = 'client'");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function createLandlord($data) {
        // Validate required fields
        if (empty($data['username'])) {
            throw new Exception('Username is required');
        }
        
        // Check if username already exists
        $existingUser = $this->getUserByUsername($data['username']);
        if ($existingUser) {
            throw new Exception('Username already exists');
        }
        
        // Generate random password if not provided
        $password = $data['password'] ?? bin2hex(random_bytes(8)); // 16 character random password
        
        // Hash password
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        
        // Create user with role = 'client'
        $userData = [
            'username' => $data['username'],
            'password' => $hashedPassword,
            'role' => 'client',
            'fullName' => $data['fullName'] ?? null,
            'phone' => $data['phone'] ?? null,
            'idNumber' => $data['idNumber'] ?? null,
        ];
        if (array_key_exists('propertyLimit', $data)) {
            $userData['propertyLimit'] = $data['propertyLimit'];
        }
        
        $user = $this->createUser($userData);
        
        // Verify user was created successfully
        if (!$user || empty($user['id'])) {
            throw new Exception('Failed to create landlord - user creation returned invalid data');
        }
        
        // Double-check by fetching from database
        $verifyUser = $this->getUser($user['id']);
        if (!$verifyUser) {
            throw new Exception('Failed to create landlord - user not found in database after creation');
        }
        
        // Return user with generated password (for sending to client)
        return array_merge($user, [
            'generatedPassword' => $password, // Only returned on creation, not stored
            'fullName' => $data['fullName'] ?? null,
            'phone' => $data['phone'] ?? null,
            'idNumber' => $data['idNumber'] ?? null,
            'propertyLimit' => $data['propertyLimit'] ?? null
        ]);
    }

    public function updateLandlord($id, $data) {
        $fields = [];
        $values = [];
        
        $allowed = ['username', 'password', 'fullName', 'phone', 'idNumber', 'propertyLimit'];
        foreach ($allowed as $key) {
            if (isset($data[$key])) {
                if ($key === 'password') {
                    // Hash password if provided
                    $fields[] = "password = ?";
                    $values[] = password_hash($data[$key], PASSWORD_BCRYPT);
                } elseif ($key === 'username') {
                    $fields[] = "username = ?";
                    $values[] = $data[$key];
                } elseif ($key === 'fullName' && $this->columnExists('users', 'full_name')) {
                    $fields[] = "full_name = ?";
                    $values[] = $data[$key];
                } elseif ($key === 'phone' && $this->columnExists('users', 'phone')) {
                    $fields[] = "phone = ?";
                    $values[] = $data[$key];
                } elseif ($key === 'idNumber' && $this->columnExists('users', 'id_number')) {
                    $fields[] = "id_number = ?";
                    $values[] = $data[$key];
                } elseif ($key === 'propertyLimit' && $this->columnExists('users', 'property_limit')) {
                    $fields[] = "property_limit = ?";
                    $values[] = $data[$key];
                }
            }
        }
        
        if (empty($fields)) {
            return $this->getLandlord($id);
        }
        
        $values[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ? AND role = 'client'";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getLandlord($id);
    }

    public function deleteLandlord($id) {
        // Check if landlord has properties
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as count FROM properties WHERE landlord_id = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            throw new Exception('Cannot delete landlord with properties. Please delete properties first.');
        }
        
        // Delete user (landlord)
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE id = ? AND role = 'client'");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function sendLandlordLoginDetails($id, $generateNew = false) {
        $landlord = $this->getLandlord($id);
        if (!$landlord) {
            throw new Exception('Landlord not found');
        }
        
        if ($generateNew) {
            // Generate new random password
            $newPassword = bin2hex(random_bytes(8)); // 16 character random password
            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
            
            // Update password
            $stmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->execute([$hashedPassword, $id]);
            
            // Return credentials (in real implementation, send via email/SMS)
            return [
                'success' => true,
                'message' => 'New login credentials generated',
                'username' => $landlord['username'],
                'password' => $newPassword, // Only for sending, not stored in response normally
                'note' => 'Send these credentials securely to the landlord via email/SMS'
            ];
        } else {
            // Return existing credentials message (in real implementation, send via email/SMS)
            return [
                'success' => true,
                'message' => 'Login credentials reminder sent',
                'username' => $landlord['username'],
                'note' => 'Send login credentials reminder to the landlord via email/SMS'
            ];
        }
    }

    // ========== PROPERTIES ==========
    public function getAllProperties($landlordId = null, $propertyId = null) {
        $sql = "SELECT * FROM properties WHERE 1=1";
        $params = [];
        
        if ($landlordId) {
            // Check if landlord_id column exists (for backward compatibility)
            $hasLandlordId = $this->columnExists('properties', 'landlord_id');
            
            if ($hasLandlordId) {
                $sql .= " AND landlord_id = ?";
                $params[] = $landlordId;
            } else {
                // Fallback to landlord_email if landlord_id column doesn't exist
                $landlord = $this->getUser($landlordId);
                if ($landlord && isset($landlord['username'])) {
                    $sql .= " AND landlord_email = ?";
                    $params[] = $landlord['username'];
                }
            }
        }
        
        if ($propertyId) {
            $sql .= " AND id = ?";
            $params[] = $propertyId;
        }
        
        $sql .= " ORDER BY created_at DESC";
        
        if (empty($params)) {
            $stmt = $this->pdo->query($sql);
        } else {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
        }
        
        return $stmt->fetchAll();
    }

    public function getProperty($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM properties WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function createProperty($data) {
        // Require landlordId
        if (empty($data['landlordId'])) {
            throw new Exception('landlordId is required');
        }
        
        // Validate landlord exists
        $landlord = $this->getUser($data['landlordId']);
        if (!$landlord) {
            throw new Exception('Landlord not found');
        }

        // Enforce property limit if configured for landlord
        if ($this->columnExists('users', 'property_limit') && isset($landlord['property_limit'])) {
            $limit = $landlord['property_limit'];
            if ($limit !== null && $limit !== '') {
                $limitValue = (int) $limit;
                $hasLandlordIdColumn = $this->columnExists('properties', 'landlord_id');
                if ($hasLandlordIdColumn) {
                    $stmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM properties WHERE landlord_id = ?");
                    $stmt->execute([$data['landlordId']]);
                } else {
                    $stmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM properties WHERE landlord_email = ?");
                    $stmt->execute([$landlord['username'] ?? '']);
                }
                $result = $stmt->fetch();
                $currentCount = (int) ($result['count'] ?? 0);
                if ($currentCount >= $limitValue) {
                    throw new Exception("Property limit reached for this customer ({$limitValue}).");
                }
            }
        }
        
        $id = $this->generateUUID();
        
        // Check if landlord_id column exists (for backward compatibility)
        $hasLandlordId = $this->columnExists('properties', 'landlord_id');
        
        $hasAccountPrefix = $this->columnExists('properties', 'account_prefix');
        
        if ($hasLandlordId) {
            // Use landlord_id foreign key (new schema)
            $columns = ['id', 'name', 'address', 'landlord_id', 'landlord_name', 'landlord_phone', 'landlord_email', 'status'];
            $values = [
                $id,
                $data['name'],
                $data['address'],
                $data['landlordId'],  // Foreign key
                $landlord['username'] ?? $data['landlordName'] ?? null,  // Auto-populate from user
                $data['landlordPhone'] ?? null,
                $data['landlordEmail'] ?? $landlord['username'] ?? null,
                $data['status'] ?? 'active'
            ];

            if ($hasAccountPrefix && array_key_exists('accountPrefix', $data)) {
                $columns[] = 'account_prefix';
                $values[] = $data['accountPrefix'];
            }

            $placeholders = implode(', ', array_fill(0, count($columns), '?'));
            $stmt = $this->pdo->prepare("INSERT INTO properties (" . implode(', ', $columns) . ") VALUES ({$placeholders})");
            $stmt->execute($values);
        } else {
            // Fallback for old schema without landlord_id column
            $columns = ['id', 'name', 'address', 'landlord_name', 'landlord_phone', 'landlord_email', 'status'];
            $values = [
                $id,
                $data['name'],
                $data['address'],
                $landlord['username'] ?? $data['landlordName'] ?? null,
                $data['landlordPhone'] ?? null,
                $data['landlordEmail'] ?? $landlord['username'] ?? null,
                $data['status'] ?? 'active'
            ];

            if ($hasAccountPrefix && array_key_exists('accountPrefix', $data)) {
                $columns[] = 'account_prefix';
                $values[] = $data['accountPrefix'];
            }

            $placeholders = implode(', ', array_fill(0, count($columns), '?'));
            $stmt = $this->pdo->prepare("INSERT INTO properties (" . implode(', ', $columns) . ") VALUES ({$placeholders})");
            $stmt->execute($values);
        }
        
        return $this->getProperty($id);
    }

    public function updateProperty($id, $data) {
        $fields = [];
        $values = [];
        
        $allowed = ['name', 'address', 'landlord_name', 'landlord_phone', 'landlord_email', 'status'];
        foreach ($allowed as $field) {
            $key = str_replace('_', '', lcfirst(ucwords($field, '_')));
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }

        if ($this->columnExists('properties', 'account_prefix') && array_key_exists('accountPrefix', $data)) {
            $fields[] = "account_prefix = ?";
            $values[] = $data['accountPrefix'];
        }
        
        if (empty($fields)) return $this->getProperty($id);
        
        $values[] = $id;
        $sql = "UPDATE properties SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getProperty($id);
    }

    public function deleteProperty($id) {
        // Check for active leases
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as count FROM leases l
            INNER JOIN units u ON l.unit_id = u.id
            WHERE u.property_id = ? AND l.status = 'active'
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            throw new Exception('Cannot delete property with units that have active leases.');
        }
        
        // Delete related data
        $this->pdo->prepare("DELETE FROM charge_codes WHERE property_id = ?")->execute([$id]);
        $this->pdo->prepare("DELETE FROM house_types WHERE property_id = ?")->execute([$id]);
        $this->pdo->prepare("DELETE FROM units WHERE property_id = ?")->execute([$id]);
        
        $stmt = $this->pdo->prepare("DELETE FROM properties WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function disableProperty($id) {
        $this->pdo->prepare("UPDATE properties SET status = 'inactive' WHERE id = ?")->execute([$id]);
        return $this->getProperty($id);
    }

    public function enableProperty($id) {
        $this->pdo->prepare("UPDATE properties SET status = 'active' WHERE id = ?")->execute([$id]);
        return $this->getProperty($id);
    }

    // ========== HOUSE TYPES ==========
    public function getAllHouseTypes() {
        $stmt = $this->pdo->query("SELECT * FROM house_types ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getHouseType($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM house_types WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function createHouseType($data) {
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO house_types (id, property_id, name, description, base_rent_amount, rent_deposit_amount, 
            water_rate_per_unit, water_rate_type, water_flat_rate, charge_amounts, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['propertyId'],
            $data['name'],
            $data['description'] ?? null,
            $data['baseRentAmount'],
            $data['rentDepositAmount'] ?? '0.00',
            $data['waterRatePerUnit'] ?? '15.50',
            $data['waterRateType'] ?? 'unit_based',
            $data['waterFlatRate'] ?? '0.00',
            isset($data['chargeAmounts']) ? json_encode($data['chargeAmounts']) : null,
            $data['isActive'] ?? 'true'
        ]);
        return $this->getHouseType($id);
    }

    public function updateHouseType($id, $data) {
        $fields = [];
        $values = [];
        
        $mapping = [
            'propertyId' => 'property_id',
            'name' => 'name',
            'description' => 'description',
            'baseRentAmount' => 'base_rent_amount',
            'rentDepositAmount' => 'rent_deposit_amount',
            'waterRatePerUnit' => 'water_rate_per_unit',
            'waterRateType' => 'water_rate_type',
            'waterFlatRate' => 'water_flat_rate',
            'chargeAmounts' => 'charge_amounts',
            'isActive' => 'is_active'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $value = ($key === 'chargeAmounts' && is_array($data[$key])) 
                    ? json_encode($data[$key]) 
                    : $data[$key];
                $values[] = $value;
            }
        }
        
        if (empty($fields)) return $this->getHouseType($id);
        
        $values[] = $id;
        $sql = "UPDATE house_types SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getHouseType($id);
    }

    public function deleteHouseType($id) {
        // Check for active leases
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as count FROM leases l
            INNER JOIN units u ON l.unit_id = u.id
            WHERE u.house_type_id = ? AND l.status = 'active'
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            throw new Exception('Cannot delete house type with units that have active leases.');
        }
        
        $this->pdo->prepare("DELETE FROM units WHERE house_type_id = ?")->execute([$id]);
        $stmt = $this->pdo->prepare("DELETE FROM house_types WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== UNITS ==========
    public function getAllUnits() {
        $stmt = $this->pdo->query("SELECT * FROM units ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getUnit($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM units WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getUnitsByProperty($propertyId) {
        $stmt = $this->pdo->prepare("SELECT * FROM units WHERE property_id = ? ORDER BY unit_number");
        $stmt->execute([$propertyId]);
        return $stmt->fetchAll();
    }

    public function createUnit($data) {
        // Verify property and house type exist
        if (!$this->getProperty($data['propertyId'])) {
            throw new Exception("Property not found");
        }
        if (!$this->getHouseType($data['houseTypeId'])) {
            throw new Exception("House type not found");
        }
        
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO units (id, property_id, house_type_id, unit_number, rent_amount, 
            rent_deposit_amount, water_rate_amount, charge_amounts, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['propertyId'],
            $data['houseTypeId'],
            $data['unitNumber'],
            $data['rentAmount'],
            $data['rentDepositAmount'] ?? '0.00',
            $data['waterRateAmount'] ?? '0.00',
            isset($data['chargeAmounts']) ? json_encode($data['chargeAmounts']) : null,
            $data['status'] ?? 'vacant'
        ]);
        return $this->getUnit($id);
    }

    public function updateUnit($id, $data) {
        $fields = [];
        $values = [];
        
        $mapping = [
            'propertyId' => 'property_id',
            'houseTypeId' => 'house_type_id',
            'unitNumber' => 'unit_number',
            'rentAmount' => 'rent_amount',
            'rentDepositAmount' => 'rent_deposit_amount',
            'waterRateAmount' => 'water_rate_amount',
            'chargeAmounts' => 'charge_amounts',
            'status' => 'status'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $value = ($key === 'chargeAmounts' && is_array($data[$key])) 
                    ? json_encode($data[$key]) 
                    : $data[$key];
                $values[] = $value;
            }
        }
        
        if (empty($fields)) return $this->getUnit($id);
        
        $values[] = $id;
        $sql = "UPDATE units SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getUnit($id);
    }

    public function deleteUnit($id) {
        // Check for active leases
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as count FROM leases 
            WHERE unit_id = ? AND status = 'active'
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            throw new Exception('Cannot delete unit with active lease.');
        }
        
        $stmt = $this->pdo->prepare("DELETE FROM units WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== TENANTS ==========
    public function getAllTenants() {
        $stmt = $this->pdo->query("SELECT * FROM tenants ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getTenantsByProperty($propertyId) {
        $stmt = $this->pdo->prepare(
            "SELECT DISTINCT t.*
             FROM tenants t
             INNER JOIN leases l ON l.tenant_id = t.id
             INNER JOIN units u ON u.id = l.unit_id
             INNER JOIN properties p ON p.id = u.property_id
             WHERE p.id = ?
             ORDER BY t.created_at DESC"
        );
        $stmt->execute([$propertyId]);
        return $stmt->fetchAll();
    }

    public function getTenantsByLandlord($landlordId) {
        $stmt = $this->pdo->prepare(
            "SELECT DISTINCT t.*
             FROM tenants t
             INNER JOIN leases l ON l.tenant_id = t.id
             INNER JOIN units u ON u.id = l.unit_id
             INNER JOIN properties p ON p.id = u.property_id
             WHERE p.landlord_id = ?
             ORDER BY t.created_at DESC"
        );
        $stmt->execute([$landlordId]);
        return $stmt->fetchAll();
    }

    public function getTenant($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM tenants WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getTenantByEmail($email) {
        $stmt = $this->pdo->prepare("SELECT * FROM tenants WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch();
    }

    public function getTenantByContact($identifier) {
        $identifier = trim((string) $identifier);
        if ($identifier === '') {
            return null;
        }

        $normalizedPhone = preg_replace('/\D+/', '', $identifier);
        $email = strtolower($identifier);

        $stmt = $this->pdo->prepare(
            "SELECT * FROM tenants
             WHERE email = ?
                OR phone = ?
                OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = ?
             LIMIT 1"
        );
        $stmt->execute([$email, $identifier, $normalizedPhone]);
        return $stmt->fetch();
    }

    public function setTenantPortalAccess($tenantId, $accessCode = null, $enabled = null) {
        if (!$this->columnExists('tenants', 'portal_enabled') || !$this->columnExists('tenants', 'portal_access_code_hash')) {
            throw new Exception('Tenant portal columns are missing. Run the tenant portal migration.');
        }

        $fields = [];
        $values = [];

        if ($enabled !== null) {
            $fields[] = "portal_enabled = ?";
            $values[] = $enabled ? 1 : 0;
        }

        if ($accessCode !== null) {
            $hashed = password_hash($accessCode, PASSWORD_BCRYPT);
            $fields[] = "portal_access_code_hash = ?";
            $values[] = $hashed;
        }

        if (empty($fields)) {
            return $this->getTenant($tenantId);
        }

        $values[] = $tenantId;
        $sql = "UPDATE tenants SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);

        return $this->getTenant($tenantId);
    }

    public function authenticateTenant($identifier, $accessCode) {
        $tenant = $this->getTenantByContact($identifier);
        if (!$tenant) {
            return null;
        }

        if ($this->columnExists('tenants', 'portal_enabled')) {
            $enabled = isset($tenant['portal_enabled']) ? (int) $tenant['portal_enabled'] : 0;
            if ($enabled !== 1) {
                return null;
            }
        }

        if (!$this->columnExists('tenants', 'portal_access_code_hash')) {
            return null;
        }

        $hash = $tenant['portal_access_code_hash'] ?? null;
        if (!$hash || !password_verify((string) $accessCode, $hash)) {
            return null;
        }

        if ($this->columnExists('tenants', 'portal_last_login')) {
            $stmt = $this->pdo->prepare("UPDATE tenants SET portal_last_login = NOW() WHERE id = ?");
            $stmt->execute([$tenant['id']]);
        }

        return $tenant;
    }

    public function getTenantPortalProfile($tenantId) {
        $stmt = $this->pdo->prepare(
            "SELECT t.*, u.id AS unit_id, u.unit_number, p.id AS property_id, p.name AS property_name, p.address AS property_address, p.account_prefix
             FROM tenants t
             LEFT JOIN leases l ON l.tenant_id = t.id AND l.status = 'active'
             LEFT JOIN units u ON u.id = l.unit_id
             LEFT JOIN properties p ON p.id = u.property_id
             WHERE t.id = ?
             ORDER BY l.start_date DESC
             LIMIT 1"
        );
        $stmt->execute([$tenantId]);
        $profile = $stmt->fetch();

        if (!$profile) {
            return null;
        }

        if (!empty($profile['unit_id'])) {
            return $profile;
        }

        $fallback = $this->pdo->prepare(
            "SELECT t.*, u.id AS unit_id, u.unit_number, p.id AS property_id, p.name AS property_name, p.address AS property_address, p.account_prefix
             FROM tenants t
             LEFT JOIN leases l ON l.tenant_id = t.id
             LEFT JOIN units u ON u.id = l.unit_id
             LEFT JOIN properties p ON p.id = u.property_id
             WHERE t.id = ?
             ORDER BY l.start_date DESC
             LIMIT 1"
        );
        $fallback->execute([$tenantId]);
        return $fallback->fetch();
    }

    public function createTenant($data) {
        // Check for unique email
        if ($this->getTenantByEmail($data['email'])) {
            throw new Exception("Tenant with email {$data['email']} already exists");
        }
        
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO tenants (
                id, full_name, email, phone, id_number,
                emergency_contact, emergency_phone,
                secondary_contact_name, secondary_contact_phone, secondary_contact_email,
                notify_secondary
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['fullName'],
            $data['email'],
            $data['phone'],
            $data['idNumber'],
            $data['emergencyContact'] ?? null,
            $data['emergencyPhone'] ?? null,
            $data['secondaryContactName'] ?? null,
            $data['secondaryContactPhone'] ?? null,
            $data['secondaryContactEmail'] ?? null,
            $data['notifySecondary'] ?? 'false'
        ]);
        return $this->getTenant($id);
    }

    public function updateTenant($id, $data) {
        $fields = [];
        $values = [];
        
        $mapping = [
            'fullName' => 'full_name',
            'email' => 'email',
            'phone' => 'phone',
            'idNumber' => 'id_number',
            'emergencyContact' => 'emergency_contact',
            'emergencyPhone' => 'emergency_phone',
            'secondaryContactName' => 'secondary_contact_name',
            'secondaryContactPhone' => 'secondary_contact_phone',
            'secondaryContactEmail' => 'secondary_contact_email',
            'notifySecondary' => 'notify_secondary'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }
        
        if (empty($fields)) return $this->getTenant($id);
        
        $values[] = $id;
        $sql = "UPDATE tenants SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getTenant($id);
    }

    public function deleteTenant($id) {
        $stmt = $this->pdo->prepare("DELETE FROM tenants WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== LEASES ==========
    public function getAllLeases() {
        $stmt = $this->pdo->query("SELECT * FROM leases ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getLease($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM leases WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getLeasesByTenant($tenantId) {
        $stmt = $this->pdo->prepare("SELECT * FROM leases WHERE tenant_id = ? ORDER BY start_date DESC");
        $stmt->execute([$tenantId]);
        return $stmt->fetchAll();
    }

    public function getLeasesByUnit($unitId) {
        $stmt = $this->pdo->prepare("SELECT * FROM leases WHERE unit_id = ? ORDER BY start_date DESC");
        $stmt->execute([$unitId]);
        return $stmt->fetchAll();
    }

    public function getActiveLeases() {
        $dbType = $this->getDbType();
        $currentDateFunc = ($dbType === 'pgsql') ? 'CURRENT_DATE' : 'CURDATE()';
        
        $stmt = $this->pdo->query("
            SELECT * FROM leases 
            WHERE status = 'active' 
            AND start_date <= {$currentDateFunc} 
            AND end_date >= {$currentDateFunc}
            ORDER BY start_date DESC
        ");
        return $stmt->fetchAll();
    }

    public function createLease($data) {
        // Verify unit and tenant exist
        if (!$this->getUnit($data['unitId'])) {
            throw new Exception("Unit not found");
        }
        if (!$this->getTenant($data['tenantId'])) {
            throw new Exception("Tenant not found");
        }
        
        // Check for overlapping leases
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as count FROM leases 
            WHERE unit_id = ? 
            AND status = 'active' 
            AND (
                (start_date <= ? AND end_date >= ?) OR
                (start_date <= ? AND end_date >= ?) OR
                (start_date >= ? AND end_date <= ?)
            )
        ");
        $stmt->execute([
            $data['unitId'],
            $data['startDate'], $data['startDate'],
            $data['endDate'], $data['endDate'],
            $data['startDate'], $data['endDate']
        ]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            throw new Exception("Unit already has an active lease during the specified period");
        }
        
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO leases (id, unit_id, tenant_id, start_date, end_date, rent_amount, 
            deposit_amount, water_rate_per_unit, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['unitId'],
            $data['tenantId'],
            $data['startDate'],
            $data['endDate'],
            $data['rentAmount'],
            $data['depositAmount'],
            $data['waterRatePerUnit'] ?? '15.50',
            $data['status'] ?? 'active'
        ]);
        
        // Update unit status
        if (($data['status'] ?? 'active') === 'active') {
            $this->updateUnitStatusFromLeases($data['unitId']);
        }
        
        return $this->getLease($id);
    }

    public function updateLease($id, $data) {
        $existing = $this->getLease($id);
        if (!$existing) return null;
        
        $fields = [];
        $values = [];
        
        $mapping = [
            'unitId' => 'unit_id',
            'tenantId' => 'tenant_id',
            'startDate' => 'start_date',
            'endDate' => 'end_date',
            'rentAmount' => 'rent_amount',
            'depositAmount' => 'deposit_amount',
            'waterRatePerUnit' => 'water_rate_per_unit',
            'status' => 'status'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }
        
        if (empty($fields)) return $existing;
        
        $values[] = $id;
        $sql = "UPDATE leases SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        // Update unit status if status changed
        if (isset($data['status']) && $data['status'] !== $existing['status']) {
            $this->updateUnitStatusFromLeases($existing['unit_id']);
        }
        
        return $this->getLease($id);
    }

    public function deleteLease($id) {
        $lease = $this->getLease($id);
        if (!$lease) return false;
        
        $unitId = $lease['unit_id'];
        $stmt = $this->pdo->prepare("DELETE FROM leases WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            $this->updateUnitStatusFromLeases($unitId);
        }
        
        return $stmt->rowCount() > 0;
    }

    // ========== INVOICES ==========
    public function getAllInvoices() {
        $stmt = $this->pdo->query("SELECT * FROM invoices ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getInvoice($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM invoices WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getInvoicesByLease($leaseId) {
        $stmt = $this->pdo->prepare("SELECT * FROM invoices WHERE lease_id = ? ORDER BY issue_date DESC");
        $stmt->execute([$leaseId]);
        return $stmt->fetchAll();
    }

    public function getOverdueInvoices() {
        $dbType = $this->getDbType();
        $currentDateFunc = ($dbType === 'pgsql') ? 'CURRENT_DATE' : 'CURDATE()';
        
        $stmt = $this->pdo->query("
            SELECT i.* FROM invoices i
            LEFT JOIN payments p ON i.id = p.invoice_id
            WHERE i.due_date < {$currentDateFunc}
            AND i.status != 'paid'
            GROUP BY i.id
            HAVING COALESCE(SUM(p.amount), 0) < i.amount
            ORDER BY i.due_date ASC
        ");
        return $stmt->fetchAll();
    }

    public function createInvoice($data) {
        // Verify lease exists
        if (!$this->getLease($data['leaseId'])) {
            throw new Exception("Lease not found");
        }
        
        // Check for unique invoice number
        $stmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM invoices WHERE invoice_number = ?");
        $stmt->execute([$data['invoiceNumber']]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            throw new Exception("Invoice with number {$data['invoiceNumber']} already exists");
        }
        
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO invoices (id, lease_id, invoice_number, description, amount, due_date, issue_date, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['leaseId'],
            $data['invoiceNumber'],
            $data['description'],
            $data['amount'],
            $data['dueDate'],
            $data['issueDate'],
            $data['status'] ?? 'pending'
        ]);
        return $this->getInvoice($id);
    }

    public function updateInvoice($id, $data) {
        $fields = [];
        $values = [];
        
        $mapping = [
            'leaseId' => 'lease_id',
            'invoiceNumber' => 'invoice_number',
            'description' => 'description',
            'amount' => 'amount',
            'dueDate' => 'due_date',
            'issueDate' => 'issue_date',
            'status' => 'status'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }
        
        if (empty($fields)) return $this->getInvoice($id);
        
        $values[] = $id;
        $sql = "UPDATE invoices SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getInvoice($id);
    }

    public function deleteInvoice($id) {
        $stmt = $this->pdo->prepare("DELETE FROM invoices WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== PAYMENTS ==========
    public function getAllPayments() {
        $stmt = $this->pdo->query("SELECT * FROM payments ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getPayment($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM payments WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getPaymentsByLease($leaseId) {
        $stmt = $this->pdo->prepare("SELECT * FROM payments WHERE lease_id = ? ORDER BY payment_date DESC");
        $stmt->execute([$leaseId]);
        return $stmt->fetchAll();
    }

    public function getPaymentsByInvoice($invoiceId) {
        $stmt = $this->pdo->prepare("SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC");
        $stmt->execute([$invoiceId]);
        return $stmt->fetchAll();
    }

    public function createPayment($data) {
        // Verify lease exists
        if (!$this->getLease($data['leaseId'])) {
            throw new Exception("Lease not found");
        }
        
        // Verify invoice exists if provided
        if (!empty($data['invoiceId']) && !$this->getInvoice($data['invoiceId'])) {
            throw new Exception("Invoice not found");
        }
        
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO payments (id, lease_id, invoice_id, amount, payment_date, payment_method, reference, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['leaseId'],
            $data['invoiceId'] ?? null,
            $data['amount'],
            $data['paymentDate'],
            $data['paymentMethod'],
            $data['reference'] ?? null,
            $data['notes'] ?? null
        ]);
        
        // Update invoice status if payment is against an invoice
        if (!empty($data['invoiceId'])) {
            $this->updateInvoiceStatusAfterPayment($data['invoiceId']);
        }
        
        return $this->getPayment($id);
    }

    public function updatePayment($id, $data) {
        $fields = [];
        $values = [];
        
        $mapping = [
            'leaseId' => 'lease_id',
            'invoiceId' => 'invoice_id',
            'amount' => 'amount',
            'paymentDate' => 'payment_date',
            'paymentMethod' => 'payment_method',
            'reference' => 'reference',
            'notes' => 'notes'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }
        
        if (empty($fields)) return $this->getPayment($id);
        
        $values[] = $id;
        $sql = "UPDATE payments SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getPayment($id);
    }

    public function deletePayment($id) {
        $stmt = $this->pdo->prepare("DELETE FROM payments WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // Helper: Update invoice status after payment
    private function updateInvoiceStatusAfterPayment($invoiceId) {
        $invoice = $this->getInvoice($invoiceId);
        if (!$invoice) return;
        
        $payments = $this->getPaymentsByInvoice($invoiceId);
        $totalPaid = array_sum(array_column($payments, 'amount'));
        $invoiceAmount = floatval($invoice['amount']);
        
        $newStatus = 'pending';
        if ($totalPaid >= $invoiceAmount) {
            $newStatus = 'paid';
        } elseif ($totalPaid > 0) {
            $newStatus = 'partial';
        }
        
        if ($newStatus !== $invoice['status']) {
            $this->updateInvoice($invoiceId, ['status' => $newStatus]);
        }
    }

    // ========== MESSAGES ==========
    public function getAllMessages() {
        $stmt = $this->pdo->query("SELECT * FROM messages ORDER BY sent_at DESC");
        return $stmt->fetchAll();
    }

    public function getMessage($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM messages WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getMessagesByTenant($tenantId) {
        $stmt = $this->pdo->prepare("SELECT * FROM messages WHERE tenant_id = ? ORDER BY sent_at DESC");
        $stmt->execute([$tenantId]);
        return $stmt->fetchAll();
    }

    public function getMessagesByProperty($propertyId) {
        $stmt = $this->pdo->prepare("SELECT * FROM messages WHERE property_id = ? ORDER BY sent_at DESC");
        $stmt->execute([$propertyId]);
        return $stmt->fetchAll();
    }

    public function createMessage($data) {
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO messages (id, tenant_id, property_id, channel, subject, content, direction, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['tenantId'] ?? null,
            $data['propertyId'] ?? null,
            $data['channel'],
            $data['subject'] ?? null,
            $data['content'],
            $data['direction'],
            $data['status'] ?? 'sent'
        ]);
        return $this->getMessage($id);
    }

    public function updateMessage($id, $data) {
        $fields = [];
        $values = [];
        
        $mapping = [
            'tenantId' => 'tenant_id',
            'propertyId' => 'property_id',
            'channel' => 'channel',
            'subject' => 'subject',
            'content' => 'content',
            'direction' => 'direction',
            'status' => 'status'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }
        
        if (empty($fields)) return $this->getMessage($id);
        
        $values[] = $id;
        $sql = "UPDATE messages SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getMessage($id);
    }

    public function deleteMessage($id) {
        $stmt = $this->pdo->prepare("DELETE FROM messages WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== BULK MESSAGES ==========
    public function getAllBulkMessages() {
        $stmt = $this->pdo->query("SELECT * FROM bulk_messages ORDER BY sent_at DESC");
        return $stmt->fetchAll();
    }

    public function getBulkMessage($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM bulk_messages WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function createBulkMessage($data) {
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO bulk_messages (id, message_type, subject, content, total_recipients) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['messageType'],
            $data['subject'] ?? null,
            $data['content'],
            $data['totalRecipients']
        ]);
        return $this->getBulkMessage($id);
    }

    public function updateBulkMessage($id, $data) {
        $fields = [];
        $values = [];
        
        $mapping = [
            'messageType' => 'message_type',
            'subject' => 'subject',
            'content' => 'content',
            'totalRecipients' => 'total_recipients'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }
        
        if (empty($fields)) return $this->getBulkMessage($id);
        
        $values[] = $id;
        $sql = "UPDATE bulk_messages SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getBulkMessage($id);
    }

    public function deleteBulkMessage($id) {
        $this->pdo->prepare("DELETE FROM message_recipients WHERE bulk_message_id = ?")->execute([$id]);
        $stmt = $this->pdo->prepare("DELETE FROM bulk_messages WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== MESSAGE RECIPIENTS ==========
    public function getAllMessageRecipients() {
        $stmt = $this->pdo->query("SELECT * FROM message_recipients ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getMessageRecipient($id) {
        $stmt = $this->pdo->prepare("
            SELECT mr.*, COALESCE(u.full_name, u.username) AS sent_by_name
            FROM message_recipients mr
            LEFT JOIN users u ON mr.sent_by_user_id = u.id
            WHERE mr.id = ?
        ");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getMessageRecipientsByBulkMessage($bulkMessageId) {
        $stmt = $this->pdo->prepare("SELECT * FROM message_recipients WHERE bulk_message_id = ? ORDER BY created_at DESC");
        $stmt->execute([$bulkMessageId]);
        return $stmt->fetchAll();
    }

    public function getMessageRecipientsByTenant($tenantId) {
        $stmt = $this->pdo->prepare("SELECT * FROM message_recipients WHERE tenant_id = ? ORDER BY created_at DESC");
        $stmt->execute([$tenantId]);
        return $stmt->fetchAll();
    }

    public function createMessageRecipient($data) {
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO message_recipients (id, bulk_message_id, tenant_id, channel, recipient_contact, status) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['bulkMessageId'],
            $data['tenantId'],
            $data['channel'],
            $data['recipientContact'],
            $data['status'] ?? 'pending'
        ]);
        return $this->getMessageRecipient($id);
    }

    public function updateMessageRecipient($id, $data) {
        $fields = [];
        $values = [];
        
        $mapping = [
            'bulkMessageId' => 'bulk_message_id',
            'tenantId' => 'tenant_id',
            'channel' => 'channel',
            'recipientContact' => 'recipient_contact',
            'status' => 'status',
            'sentAt' => 'sent_at',
            'deliveredAt' => 'delivered_at',
            'errorMessage' => 'error_message'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }
        
        if (empty($fields)) return $this->getMessageRecipient($id);
        
        $values[] = $id;
        $sql = "UPDATE message_recipients SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getMessageRecipient($id);
    }

    public function deleteMessageRecipient($id) {
        $stmt = $this->pdo->prepare("DELETE FROM message_recipients WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== MESSAGE TEMPLATES ==========
    public function getAllMessageTemplates() {
        if (!$this->tableExists('message_templates')) {
            return [];
        }
        $stmt = $this->pdo->query("SELECT * FROM message_templates ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getMessageTemplate($id) {
        if (!$this->tableExists('message_templates')) {
            return null;
        }
        $stmt = $this->pdo->prepare("SELECT * FROM message_templates WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function createMessageTemplate($data) {
        if (!$this->tableExists('message_templates')) {
            return null;
        }
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO message_templates (id, name, channel, subject, content, is_system)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['name'],
            $data['channel'],
            $data['subject'] ?? null,
            $data['content'],
            !empty($data['isSystem']) ? 1 : 0
        ]);
        return $this->getMessageTemplate($id);
    }

    public function updateMessageTemplate($id, $data) {
        if (!$this->tableExists('message_templates')) {
            return null;
        }
        $fields = [];
        $values = [];

        $mapping = [
            'name' => 'name',
            'channel' => 'channel',
            'subject' => 'subject',
            'content' => 'content',
            'isSystem' => 'is_system'
        ];

        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $key === 'isSystem' ? (!empty($data[$key]) ? 1 : 0) : $data[$key];
            }
        }

        if (empty($fields)) return $this->getMessageTemplate($id);

        $values[] = $id;
        $sql = "UPDATE message_templates SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);

        return $this->getMessageTemplate($id);
    }

    public function deleteMessageTemplate($id) {
        if (!$this->tableExists('message_templates')) {
            return false;
        }
        $stmt = $this->pdo->prepare("DELETE FROM message_templates WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== ACTIVITY LOGS ==========
    public function logActivity($data) {
        if (!$this->tableExists('activity_logs')) {
            return null;
        }
        $id = $this->generateUUID();
        $action = $data['action'] ?? 'Activity';
        $type = $data['type'] ?? 'system';
        try {
        $stmt = $this->pdo->prepare("
            INSERT INTO activity_logs (id, action, details, type, status, user_id, property_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
                $action,
            $data['details'] ?? null,
                $type,
            $data['status'] ?? 'success',
            $data['userId'] ?? null,
            $data['propertyId'] ?? null
        ]);
        return $id;
        } catch (Exception $e) {
            error_log("Activity log insert failed: " . $e->getMessage());
            return null;
        }
    }

    public function getActivityLogs($filters = []) {
        if (!$this->tableExists('activity_logs')) {
            return [];
        }
        $hasFullName = $this->columnExists('users', 'full_name');
        $userNameSelect = $hasFullName
            ? "COALESCE(u.full_name, u.username) AS user_name"
            : "u.username AS user_name";

        try {
            $sql = "SELECT al.*, {$userNameSelect}
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE 1=1";
        $params = [];
            $limit = null;

        if (!empty($filters['type'])) {
            $sql .= " AND al.type = ?";
            $params[] = $filters['type'];
        }
        if (!empty($filters['userId'])) {
            $sql .= " AND al.user_id = ?";
            $params[] = $filters['userId'];
        }
        if (!empty($filters['propertyId'])) {
            $sql .= " AND al.property_id = ?";
            $params[] = $filters['propertyId'];
        }
        if (!empty($filters['search'])) {
            $searchParam = '%' . $filters['search'] . '%';
                if ($hasFullName) {
                    $sql .= " AND (al.action LIKE ? OR al.details LIKE ? OR u.username LIKE ? OR u.full_name LIKE ?)";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
                } else {
                    $sql .= " AND (al.action LIKE ? OR al.details LIKE ? OR u.username LIKE ?)";
                    $params[] = $searchParam;
                    $params[] = $searchParam;
                    $params[] = $searchParam;
                }
        }
        if (!empty($filters['dateFrom'])) {
            $sql .= " AND al.created_at >= ?";
            $params[] = $filters['dateFrom'] . ' 00:00:00';
        }
        if (!empty($filters['dateTo'])) {
            $sql .= " AND al.created_at <= ?";
            $params[] = $filters['dateTo'] . ' 23:59:59';
        }
            if (!empty($filters['limit'])) {
                $limit = max(1, (int)$filters['limit']);
            }

            $sql .= " ORDER BY al.created_at DESC";
            if ($limit) {
                $sql .= " LIMIT " . $limit;
            } else {
                $sql .= " LIMIT 1000";
            }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
        } catch (Exception $e) {
            error_log("Activity log fetch failed: " . $e->getMessage());
            return [];
        }
    }

    // ========== INVOICE ITEMS ==========
    public function getAllInvoiceItems() {
        $stmt = $this->pdo->query("SELECT * FROM invoice_items ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getInvoiceItem($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM invoice_items WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getInvoiceItemsByInvoice($invoiceId) {
        $stmt = $this->pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at");
        $stmt->execute([$invoiceId]);
        return $stmt->fetchAll();
    }

    public function createInvoiceItem($data) {
        // Verify invoice exists
        if (!$this->getInvoice($data['invoiceId'])) {
            throw new Exception("Invoice not found");
        }
        
        // Calculate amount
        $quantity = floatval($data['quantity'] ?? 1);
        $unitPrice = floatval($data['unitPrice']);
        $amount = $quantity * $unitPrice;
        
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO invoice_items (id, invoice_id, charge_code, description, quantity, unit_price, amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['invoiceId'],
            $data['chargeCode'],
            $data['description'],
            $quantity,
            $unitPrice,
            $amount
        ]);
        
        // Recalculate invoice total
        $this->recalculateInvoiceTotal($data['invoiceId']);
        
        return $this->getInvoiceItem($id);
    }

    public function updateInvoiceItem($id, $data) {
        $existing = $this->getInvoiceItem($id);
        if (!$existing) return null;
        
        // Recalculate amount if quantity or unitPrice changed
        if (isset($data['quantity']) || isset($data['unitPrice'])) {
            $quantity = floatval($data['quantity'] ?? $existing['quantity']);
            $unitPrice = floatval($data['unitPrice'] ?? $existing['unit_price']);
            $data['amount'] = $quantity * $unitPrice;
        }
        
        $fields = [];
        $values = [];
        
        $mapping = [
            'invoiceId' => 'invoice_id',
            'chargeCode' => 'charge_code',
            'description' => 'description',
            'quantity' => 'quantity',
            'unitPrice' => 'unit_price',
            'amount' => 'amount'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }
        
        if (empty($fields)) return $existing;
        
        $values[] = $id;
        $sql = "UPDATE invoice_items SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        // Recalculate invoice total
        $this->recalculateInvoiceTotal($existing['invoice_id']);
        
        return $this->getInvoiceItem($id);
    }

    public function deleteInvoiceItem($id) {
        $item = $this->getInvoiceItem($id);
        if (!$item) return false;
        
        $invoiceId = $item['invoice_id'];
        $stmt = $this->pdo->prepare("DELETE FROM invoice_items WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            $this->recalculateInvoiceTotal($invoiceId);
        }
        
        return $stmt->rowCount() > 0;
    }

    // Helper: Recalculate invoice total from items
    private function recalculateInvoiceTotal($invoiceId) {
        $items = $this->getInvoiceItemsByInvoice($invoiceId);
        $totalAmount = array_sum(array_column($items, 'amount'));
        $this->updateInvoice($invoiceId, ['amount' => number_format($totalAmount, 2, '.', '')]);
    }

    // ========== WATER READINGS ==========
    public function getAllWaterReadings() {
        $stmt = $this->pdo->query("SELECT * FROM water_readings ORDER BY reading_date DESC");
        return $stmt->fetchAll();
    }

    public function getWaterReading($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM water_readings WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getWaterReadingsByUnit($unitId) {
        $stmt = $this->pdo->prepare("SELECT * FROM water_readings WHERE unit_id = ? ORDER BY reading_date DESC");
        $stmt->execute([$unitId]);
        return $stmt->fetchAll();
    }

    public function getWaterReadingsByStatus($status) {
        $stmt = $this->pdo->prepare("SELECT * FROM water_readings WHERE status = ? ORDER BY reading_date DESC");
        $stmt->execute([$status]);
        return $stmt->fetchAll();
    }

    public function createWaterReading($data) {
        // Verify unit exists
        if (!$this->getUnit($data['unitId'])) {
            throw new Exception("Unit not found");
        }
        
        // Get active lease for water rate
        $stmt = $this->pdo->prepare("
            SELECT water_rate_per_unit FROM leases 
            WHERE unit_id = ? 
            AND status = 'active' 
            AND start_date <= ? 
            AND end_date >= ?
            ORDER BY start_date DESC 
            LIMIT 1
        ");
        $stmt->execute([$data['unitId'], $data['readingDate'], $data['readingDate']]);
        $lease = $stmt->fetch();
        $ratePerUnit = $lease ? floatval($lease['water_rate_per_unit']) : 15.50;
        
        // Get previous reading (allow override)
        if (isset($data['previousReading']) && $data['previousReading'] !== '') {
            $previousReading = floatval($data['previousReading']);
        } else {
        $previousReadings = $this->getWaterReadingsByUnit($data['unitId']);
        $previousReading = $previousReadings ? floatval($previousReadings[0]['current_reading']) : 0;
        }
        
        $currentReading = floatval($data['currentReading']);
        
        if ($currentReading < $previousReading) {
            throw new Exception("Current reading cannot be less than previous reading");
        }
        
        $consumption = $currentReading - $previousReading;
        $totalAmount = $consumption * $ratePerUnit;
        
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO water_readings (id, unit_id, reading_date, previous_reading, current_reading, 
            consumption, rate_per_unit, total_amount, status, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['unitId'],
            $data['readingDate'],
            $previousReading,
            $currentReading,
            $consumption,
            $ratePerUnit,
            $totalAmount,
            $data['status'] ?? 'pending',
            $data['notes'] ?? null
        ]);
        return $this->getWaterReading($id);
    }

    public function updateWaterReading($id, $data) {
        $existing = $this->getWaterReading($id);
        if (!$existing) return null;
        
        // Recalculate if reading values changed
        if (isset($data['currentReading']) || isset($data['ratePerUnit'])) {
            $previousReading = floatval($existing['previous_reading']);
            $currentReading = floatval($data['currentReading'] ?? $existing['current_reading']);
            $ratePerUnit = floatval($data['ratePerUnit'] ?? $existing['rate_per_unit']);
            
            if ($currentReading < $previousReading) {
                throw new Exception("Current reading cannot be less than previous reading");
            }
            
            $consumption = $currentReading - $previousReading;
            $totalAmount = $consumption * $ratePerUnit;
            
            $data['consumption'] = $consumption;
            $data['totalAmount'] = $totalAmount;
        }
        
        $fields = [];
        $values = [];
        
        $mapping = [
            'unitId' => 'unit_id',
            'readingDate' => 'reading_date',
            'currentReading' => 'current_reading',
            'consumption' => 'consumption',
            'ratePerUnit' => 'rate_per_unit',
            'totalAmount' => 'total_amount',
            'status' => 'status',
            'notes' => 'notes'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }
        
        if (empty($fields)) return $existing;
        
        // Always update last_modified_at
        $fields[] = "last_modified_at = NOW()";
        
        $values[] = $id;
        $sql = "UPDATE water_readings SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getWaterReading($id);
    }

    public function deleteWaterReading($id) {
        $stmt = $this->pdo->prepare("DELETE FROM water_readings WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== CHARGE CODES ==========
    public function getChargeCodesByProperty($propertyId) {
        $stmt = $this->pdo->prepare("SELECT * FROM charge_codes WHERE property_id = ? ORDER BY created_at DESC");
        $stmt->execute([$propertyId]);
        return $stmt->fetchAll();
    }

    public function getChargeCode($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM charge_codes WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function createChargeCode($data) {
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO charge_codes (id, property_id, name, description, is_active) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['propertyId'],
            $data['name'],
            $data['description'] ?? null,
            $data['isActive'] ?? 'true'
        ]);
        return $this->getChargeCode($id);
    }

    public function updateChargeCode($id, $data) {
        $fields = [];
        $values = [];
        
        $mapping = [
            'propertyId' => 'property_id',
            'name' => 'name',
            'description' => 'description',
            'isActive' => 'is_active'
        ];
        
        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "$field = ?";
                $values[] = $data[$key];
            }
        }
        
        if (empty($fields)) return $this->getChargeCode($id);
        
        $values[] = $id;
        $sql = "UPDATE charge_codes SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $this->getChargeCode($id);
    }

    public function deleteChargeCode($id) {
        $stmt = $this->pdo->prepare("DELETE FROM charge_codes WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== BUSINESS LOGIC ==========
    public function generateMonthlyInvoices($month, $year) {
        $monthNum = intval($month);
        $targetDate = "$year-" . str_pad($month, 2, '0', STR_PAD_LEFT) . "-01";
        
        // Get active leases for the target month
        $stmt = $this->pdo->prepare("
            SELECT * FROM leases 
            WHERE status = 'active' 
            AND start_date <= ? 
            AND end_date >= ?
        ");
        $stmt->execute([$targetDate, $targetDate]);
        $leases = $stmt->fetchAll();
        
        $generatedInvoices = [];
        
        foreach ($leases as $lease) {
            $invoiceNumber = "INV-$year-" . str_pad($month, 2, '0', STR_PAD_LEFT) . "-" . substr($lease['id'], -6);
            
            // Check if invoice already exists
            $checkStmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM invoices WHERE invoice_number = ?");
            $checkStmt->execute([$invoiceNumber]);
            $exists = $checkStmt->fetch();
            
            if ($exists['count'] > 0) {
                continue; // Skip if already exists
            }
            
            $issueDate = "$year-" . str_pad($month, 2, '0', STR_PAD_LEFT) . "-01";
            $dueDate = "$year-" . str_pad($month, 2, '0', STR_PAD_LEFT) . "-05";
            
            try {
                $invoice = $this->createInvoice([
                    'leaseId' => $lease['id'],
                    'invoiceNumber' => $invoiceNumber,
                    'description' => "Monthly Rent - " . date('F Y', strtotime($targetDate)),
                    'amount' => $lease['rent_amount'],
                    'issueDate' => $issueDate,
                    'dueDate' => $dueDate
                ]);
                $generatedInvoices[] = $invoice;
            } catch (Exception $e) {
                error_log("Failed to generate invoice for lease {$lease['id']}: " . $e->getMessage());
            }
        }
        
        return $generatedInvoices;
    }

    public function calculateLeaseBalance($leaseId) {
        $invoices = $this->getInvoicesByLease($leaseId);
        $payments = $this->getPaymentsByLease($leaseId);
        
        $totalInvoiced = array_sum(array_column($invoices, 'amount'));
        $totalPaid = array_sum(array_column($payments, 'amount'));
        
        return floatval($totalInvoiced) - floatval($totalPaid);
    }

    public function getPropertyStats() {
        $properties = $this->getAllProperties();
        $units = $this->getAllUnits();
        $tenants = $this->getAllTenants();
        $activeLeases = $this->getActiveLeases();
        
        $occupiedUnits = count(array_filter($units, function($u) { return $u['status'] === 'occupied'; }));
        $vacantUnits = count(array_filter($units, function($u) { return $u['status'] === 'vacant'; }));
        
        $monthlyRevenue = array_sum(array_column($activeLeases, 'rent_amount'));
        
        // Get current month invoices - database-agnostic
        $dbType = $this->getDbType();
        if ($dbType === 'pgsql') {
            // PostgreSQL
            $stmt = $this->pdo->query("
                SELECT * FROM invoices 
                WHERE EXTRACT(MONTH FROM issue_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM issue_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ");
        } else {
            // MySQL/MariaDB
            $stmt = $this->pdo->query("
                SELECT * FROM invoices 
                WHERE MONTH(issue_date) = MONTH(CURDATE()) 
                AND YEAR(issue_date) = YEAR(CURDATE())
            ");
        }
        $currentMonthInvoices = $stmt->fetchAll();
        
        $totalInvoiced = array_sum(array_column($currentMonthInvoices, 'amount'));
        $totalPaid = 0;
        
        foreach ($currentMonthInvoices as $invoice) {
            $payments = $this->getPaymentsByInvoice($invoice['id']);
            $totalPaid += array_sum(array_column($payments, 'amount'));
        }
        
        $collectionRate = $totalInvoiced > 0 ? ($totalPaid / $totalInvoiced) * 100 : 0;
        
        return [
            'totalProperties' => count($properties),
            'totalUnits' => count($units),
            'occupiedUnits' => $occupiedUnits,
            'vacantUnits' => $vacantUnits,
            'totalTenants' => count($tenants),
            'monthlyRevenue' => floatval($monthlyRevenue),
            'collectionRate' => floatval($collectionRate)
        ];
    }

    // ========== MAINTENANCE REQUESTS ==========
    public function getMaintenanceRequests($filters = []) {
        if (!$this->tableExists('maintenance_requests')) {
            return [];
        }

        $sql = "
            SELECT m.*,
                   t.full_name AS tenant_name,
                   t.phone AS tenant_phone,
                   t.email AS tenant_email,
                   p.name AS property_name,
                   p.address AS property_address,
                   u.unit_number AS unit_number
            FROM maintenance_requests m
            LEFT JOIN tenants t ON t.id = m.tenant_id
            LEFT JOIN properties p ON p.id = m.property_id
            LEFT JOIN units u ON u.id = m.unit_id
        ";
        $where = [];
        $params = [];

        if (!empty($filters['propertyId'])) {
            $where[] = "m.property_id = ?";
            $params[] = $filters['propertyId'];
        }
        if (!empty($filters['tenantId'])) {
            $where[] = "m.tenant_id = ?";
            $params[] = $filters['tenantId'];
        }
        if (!empty($filters['landlordId'])) {
            $where[] = "p.landlord_id = ?";
            $params[] = $filters['landlordId'];
        }
        if (!empty($filters['status'])) {
            $where[] = "m.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $sql .= " ORDER BY m.created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getMaintenanceRequest($id) {
        if (!$this->tableExists('maintenance_requests')) {
            return null;
        }

        $stmt = $this->pdo->prepare("
            SELECT m.*,
                   t.full_name AS tenant_name,
                   t.phone AS tenant_phone,
                   t.email AS tenant_email,
                   p.name AS property_name,
                   p.address AS property_address,
                   u.unit_number AS unit_number
            FROM maintenance_requests m
            LEFT JOIN tenants t ON t.id = m.tenant_id
            LEFT JOIN properties p ON p.id = m.property_id
            LEFT JOIN units u ON u.id = m.unit_id
            WHERE m.id = ?
        ");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function createMaintenanceRequest($data) {
        if (!$this->tableExists('maintenance_requests')) {
            throw new Exception("Maintenance requests table not found");
        }

        $id = $this->generateUUID();
        $columns = ['id', 'title', 'description', 'status', 'priority'];
        $values = [
            $id,
            $data['title'] ?? '',
            $data['description'] ?? '',
            $data['status'] ?? 'pending',
            $data['priority'] ?? 'medium'
        ];

        if ($this->columnExists('maintenance_requests', 'tenant_id') && !empty($data['tenantId'])) {
            $columns[] = 'tenant_id';
            $values[] = $data['tenantId'];
        }
        if ($this->columnExists('maintenance_requests', 'property_id') && !empty($data['propertyId'])) {
            $columns[] = 'property_id';
            $values[] = $data['propertyId'];
        }
        if ($this->columnExists('maintenance_requests', 'unit_id') && !empty($data['unitId'])) {
            $columns[] = 'unit_id';
            $values[] = $data['unitId'];
        }
        if ($this->columnExists('maintenance_requests', 'notes') && isset($data['notes'])) {
            $columns[] = 'notes';
            $values[] = $data['notes'];
        }
        if ($this->columnExists('maintenance_requests', 'media_urls') && isset($data['mediaUrls'])) {
            $columns[] = 'media_urls';
            $values[] = $data['mediaUrls'];
        }
        if ($this->columnExists('maintenance_requests', 'response') && isset($data['response'])) {
            $columns[] = 'response';
            $values[] = $data['response'];
        }
        if ($this->columnExists('maintenance_requests', 'responded_at') && isset($data['response'])) {
            $columns[] = 'responded_at';
            $values[] = date('Y-m-d H:i:s');
        }

        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $sql = "INSERT INTO maintenance_requests (" . implode(', ', $columns) . ") VALUES (" . $placeholders . ")";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);

        return $this->getMaintenanceRequest($id);
    }

    public function updateMaintenanceRequest($id, $data) {
        if (!$this->tableExists('maintenance_requests')) {
            throw new Exception("Maintenance requests table not found");
        }

        $fields = [];
        $values = [];

        $mapping = [
            'title' => 'title',
            'description' => 'description',
            'status' => 'status',
            'priority' => 'priority'
        ];

        foreach ($mapping as $key => $field) {
            if (isset($data[$key])) {
                $fields[] = "{$field} = ?";
                $values[] = $data[$key];
            }
        }

        if ($this->columnExists('maintenance_requests', 'notes') && isset($data['notes'])) {
            $fields[] = "notes = ?";
            $values[] = $data['notes'];
        }
        if ($this->columnExists('maintenance_requests', 'response') && array_key_exists('response', $data)) {
            $fields[] = "response = ?";
            $values[] = $data['response'];
        }
        if ($this->columnExists('maintenance_requests', 'responded_at') && array_key_exists('response', $data)) {
            $fields[] = "responded_at = ?";
            $values[] = date('Y-m-d H:i:s');
        }

        if (empty($fields)) {
            return $this->getMaintenanceRequest($id);
        }

        $values[] = $id;
        $sql = "UPDATE maintenance_requests SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);

        return $this->getMaintenanceRequest($id);
    }

    public function deleteMaintenanceRequest($id) {
        if (!$this->tableExists('maintenance_requests')) {
            return false;
        }
        $stmt = $this->pdo->prepare("DELETE FROM maintenance_requests WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ========== SETTINGS ==========
    private function getSettingsByScope($table, $propertyId = null, $landlordId = null) {
        if (!$this->tableExists($table)) {
            return null;
        }
        if ($propertyId) {
            $stmt = $this->pdo->prepare("SELECT * FROM {$table} WHERE property_id = ? ORDER BY updated_at DESC LIMIT 1");
            $stmt->execute([$propertyId]);
            $row = $stmt->fetch();
            if ($row) return $row;
        }
        if ($landlordId) {
            $stmt = $this->pdo->prepare("SELECT * FROM {$table} WHERE landlord_id = ? AND (property_id IS NULL OR property_id = '') ORDER BY updated_at DESC LIMIT 1");
            $stmt->execute([$landlordId]);
            return $stmt->fetch();
        }
        return null;
    }

    private function upsertSettings($table, $propertyId, $landlordId, $data, $allowedColumns) {
        if (!$this->tableExists($table)) {
            throw new Exception("Settings table {$table} not found");
        }

        $existing = $this->getSettingsByScope($table, $propertyId, $landlordId);
        $fields = [];
        $values = [];

        foreach ($allowedColumns as $column) {
            if (array_key_exists($column, $data)) {
                $fields[] = "{$column} = ?";
                $values[] = $data[$column];
            }
        }

        if ($existing && !empty($existing['id'])) {
            if (empty($fields)) return $existing;
            $values[] = $existing['id'];
            $sql = "UPDATE {$table} SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($values);
            return $this->getSettingsByScope($table, $propertyId, $landlordId);
        }

        $id = $this->generateUUID();
        $columns = ['id', 'landlord_id', 'property_id'];
        $insertValues = [$id, $landlordId, $propertyId];

        foreach ($allowedColumns as $column) {
            if (array_key_exists($column, $data)) {
                $columns[] = $column;
                $insertValues[] = $data[$column];
            }
        }

        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $sql = "INSERT INTO {$table} (" . implode(', ', $columns) . ") VALUES ({$placeholders})";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($insertValues);

        return $this->getSettingsByScope($table, $propertyId, $landlordId);
    }

    public function getSmsSettings($propertyId = null, $landlordId = null) {
        return $this->getSettingsByScope('sms_settings', $propertyId, $landlordId);
    }

    public function saveSmsSettings($propertyId, $landlordId, $data) {
        return $this->upsertSettings('sms_settings', $propertyId, $landlordId, $data, [
            'api_url', 'api_key', 'partner_id', 'shortcode', 'sender_id', 'enabled', 'balance_threshold'
        ]);
    }

    public function getEmailSettings($propertyId = null, $landlordId = null) {
        return $this->getSettingsByScope('email_settings', $propertyId, $landlordId);
    }

    public function saveEmailSettings($propertyId, $landlordId, $data) {
        return $this->upsertSettings('email_settings', $propertyId, $landlordId, $data, [
            'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'from_email', 'from_name', 'enabled',
            'credit_balance', 'credit_threshold'
        ]);
    }

    public function getMpesaSettings($propertyId = null, $landlordId = null) {
        return $this->getSettingsByScope('mpesa_settings', $propertyId, $landlordId);
    }

    public function saveMpesaSettings($propertyId, $landlordId, $data) {
        return $this->upsertSettings('mpesa_settings', $propertyId, $landlordId, $data, [
            'consumer_key', 'consumer_secret', 'passkey', 'shortcode', 'account_reference',
            'stk_callback_url', 'balance_callback_url', 'initiator_name', 'security_credential', 'enabled'
        ]);
    }

    public function getInvoiceSettings($propertyId = null, $landlordId = null) {
        return $this->getSettingsByScope('invoice_settings', $propertyId, $landlordId);
    }

    public function saveInvoiceSettings($propertyId, $landlordId, $data) {
        return $this->upsertSettings('invoice_settings', $propertyId, $landlordId, $data, [
            'company_name', 'company_phone', 'company_email', 'company_address', 'payment_options', 'logo_url', 'enabled'
        ]);
    }

    public function getAlertSettings($propertyId = null, $landlordId = null) {
        if (!$this->tableExists('alert_settings')) {
            return [];
        }
        $where = [];
        $params = [];
        if ($propertyId) {
            $where[] = "property_id = ?";
            $params[] = $propertyId;
        } elseif ($landlordId) {
            $where[] = "landlord_id = ?";
            $params[] = $landlordId;
        }
        $sql = "SELECT * FROM alert_settings";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function saveAlertSettings($propertyId, $landlordId, $alerts) {
        if (!$this->tableExists('alert_settings')) {
            throw new Exception("alert_settings table not found");
        }
        $where = [];
        $params = [];
        if ($propertyId) {
            $where[] = "property_id = ?";
            $params[] = $propertyId;
        } elseif ($landlordId) {
            $where[] = "landlord_id = ?";
            $params[] = $landlordId;
        }
        if (!empty($where)) {
            $stmt = $this->pdo->prepare("DELETE FROM alert_settings WHERE " . implode(" AND ", $where));
            $stmt->execute($params);
        }

        if (!is_array($alerts)) return [];
        foreach ($alerts as $alert) {
            $columns = ['id', 'landlord_id', 'property_id', 'recipient_type', 'channel', 'frequency', 'enabled'];
            $values = [
                $this->generateUUID(),
                $landlordId,
                $propertyId,
                $alert['recipient_type'] ?? 'tenant',
                $alert['channel'] ?? 'sms',
                $alert['frequency'] ?? 'immediate',
                !empty($alert['enabled']) ? 1 : 0
            ];
            if ($this->columnExists('alert_settings', 'alert_type')) {
                $columns[] = 'alert_type';
                $values[] = $alert['alert_type'] ?? null;
            }
            if ($this->columnExists('alert_settings', 'enable_sms')) {
                $columns[] = 'enable_sms';
                $values[] = !empty($alert['enable_sms']) ? 1 : 0;
            }
            if ($this->columnExists('alert_settings', 'enable_email')) {
                $columns[] = 'enable_email';
                $values[] = !empty($alert['enable_email']) ? 1 : 0;
            }
            if ($this->columnExists('alert_settings', 'threshold_value')) {
                $columns[] = 'threshold_value';
                $values[] = $alert['threshold_value'] ?? null;
            }
            if ($this->columnExists('alert_settings', 'schedule_json')) {
                $columns[] = 'schedule_json';
                $values[] = $alert['schedule_json'] ?? null;
            }
            $placeholders = implode(', ', array_fill(0, count($columns), '?'));
            $stmt = $this->pdo->prepare("INSERT INTO alert_settings (" . implode(', ', $columns) . ") VALUES ({$placeholders})");
            $stmt->execute($values);
        }
        return $this->getAlertSettings($propertyId, $landlordId);
    }

    // ========== CREDIT USAGE ==========
    public function recordCreditUsage($data) {
        if (!$this->tableExists('credit_usage')) {
            return null;
        }
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO credit_usage (id, landlord_id, property_id, channel, units, unit_cost, balance_after, meta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['landlordId'] ?? null,
            $data['propertyId'] ?? null,
            $data['channel'] ?? 'sms',
            $data['units'] ?? 0,
            $data['unitCost'] ?? null,
            $data['balanceAfter'] ?? null,
            $data['meta'] ?? null
        ]);
        return $id;
    }

    public function getCreditUsage($filters = []) {
        if (!$this->tableExists('credit_usage')) {
            return [];
        }
        $where = [];
        $params = [];
        if (!empty($filters['propertyId'])) {
            $where[] = "property_id = ?";
            $params[] = $filters['propertyId'];
        }
        if (!empty($filters['landlordId'])) {
            $where[] = "landlord_id = ?";
            $params[] = $filters['landlordId'];
        }
        if (!empty($filters['channel'])) {
            $where[] = "channel = ?";
            $params[] = $filters['channel'];
        }
        $sql = "SELECT * FROM credit_usage";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $sql .= " ORDER BY created_at DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function adjustEmailCreditBalance($propertyId, $landlordId, $delta) {
        if (!$this->tableExists('email_settings')) {
            return null;
        }
        $settings = $this->getEmailSettings($propertyId, $landlordId);
        if (!$settings || !isset($settings['credit_balance'])) {
            return null;
        }
        $current = intval($settings['credit_balance']);
        $next = max(0, $current + intval($delta));
        $this->upsertSettings('email_settings', $propertyId, $landlordId, [
            'credit_balance' => $next
        ], ['credit_balance']);
        return $next;
    }

    // ========== M-PESA STK ==========
    public function createMpesaStkRequest($data) {
        if (!$this->tableExists('mpesa_stk_requests')) {
            throw new Exception("mpesa_stk_requests table not found");
        }
        $id = $this->generateUUID();
        $stmt = $this->pdo->prepare("
            INSERT INTO mpesa_stk_requests
            (id, landlord_id, property_id, tenant_id, invoice_id, phone, account_number, amount, merchant_request_id, checkout_request_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['landlordId'] ?? null,
            $data['propertyId'] ?? null,
            $data['tenantId'] ?? null,
            $data['invoiceId'] ?? null,
            $data['phone'] ?? null,
            $data['accountNumber'] ?? null,
            $data['amount'] ?? 0,
            $data['merchantRequestId'] ?? null,
            $data['checkoutRequestId'] ?? null,
            $data['status'] ?? 'pending'
        ]);
        return $id;
    }

    public function updateMpesaStkRequestByCheckout($checkoutRequestId, $data) {
        if (!$this->tableExists('mpesa_stk_requests')) {
            return null;
        }
        $fields = [];
        $values = [];
        $mapping = [
            'status' => 'status',
            'resultCode' => 'result_code',
            'resultDesc' => 'result_desc',
            'mpesaReceipt' => 'mpesa_receipt',
            'transactionDate' => 'transaction_date'
        ];
        foreach ($mapping as $key => $field) {
            if (array_key_exists($key, $data)) {
                $fields[] = "{$field} = ?";
                $values[] = $data[$key];
            }
        }
        if (empty($fields)) return null;
        $values[] = $checkoutRequestId;
        $sql = "UPDATE mpesa_stk_requests SET " . implode(', ', $fields) . " WHERE checkout_request_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        return $stmt->rowCount() > 0;
    }

    public function getMpesaStkRequestByCheckout($checkoutRequestId) {
        if (!$this->tableExists('mpesa_stk_requests')) {
            return null;
        }
        $stmt = $this->pdo->prepare("SELECT * FROM mpesa_stk_requests WHERE checkout_request_id = ? LIMIT 1");
        $stmt->execute([$checkoutRequestId]);
        return $stmt->fetch();
    }
}

// Create global storage instance
$storage = new Storage();

