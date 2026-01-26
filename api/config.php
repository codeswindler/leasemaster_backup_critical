<?php
/**
 * Database Configuration and Connection
 * Similar to Jenga Capital setup
 */

// Load environment variables from .env file
function loadEnv($path) {
    if (!file_exists($path)) {
        return false;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) {
            continue; // Skip empty lines and comments
        }
        
        if (strpos($line, '=') === false) {
            continue; // Skip lines without '='
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
    return true;
}

// Load .env file (look in parent directory)
$envPath = dirname(__DIR__) . '/.env';
loadEnv($envPath);

// Database configuration
// Use DATABASE_URL from .env (supports both PostgreSQL and MySQL)
$databaseUrl = getenv('DATABASE_URL') ?: '';

// Session configuration
$sessionSecret = getenv('SESSION_SECRET') ?: 'change-this-secret-in-production';

// Create PDO connection
try {
    $dsn = null;
    $dbUser = null;
    $dbPass = null;
    $options = [];
    
    // Parse DATABASE_URL or fallback to individual vars
    // PRODUCTION: MariaDB/MySQL only - PostgreSQL support removed
    if (!empty($databaseUrl)) {
        // Parse MySQL/MariaDB connection string: mysql://user:pass@host:port/dbname
        if (preg_match('#mysql://([^:]+):([^@]+)@([^:/]+)(:(\d+))?/(.+)#', $databaseUrl, $matches)) {
            $dbUser = urldecode($matches[1]);
            $dbPass = urldecode($matches[2]);
            $dbHost = $matches[3];
            $dbPort = isset($matches[5]) && !empty($matches[5]) ? $matches[5] : '3306';
            $dbName = urldecode($matches[6]);
            $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
        } else {
            throw new Exception("Invalid DATABASE_URL format. Expected: mysql://user:pass@host:port/dbname (MariaDB/MySQL only)");
        }
    } else {
        // Fallback to individual MySQL variables (for backward compatibility)
        $dbHost = getenv('DB_HOST') ?: 'localhost';
        $dbName = getenv('DB_NAME') ?: 'leasemaster_db';
        $dbUser = getenv('DB_USER') ?: 'leasemaster_user';
        $dbPass = getenv('DB_PASS') ?: '';
        $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
    }
    
    if (empty($dsn)) {
        throw new Exception("Failed to construct database DSN. DATABASE_URL might be empty or malformed.");
    }
    
    $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
    // Ensure DB timestamps are in UTC to avoid cross-server drift issues.
    $pdo->exec("SET time_zone = '+00:00'");
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Database connection failed',
        'message' => $e->getMessage()
    ]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Database configuration error',
        'message' => $e->getMessage(),
        'debug' => [
            'DATABASE_URL_set' => !empty($databaseUrl),
            'DATABASE_URL_preview' => !empty($databaseUrl) ? substr($databaseUrl, 0, 30) . '...' : 'not set'
        ]
    ]);
    exit;
}

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_secure' => isset($_SERVER['HTTPS']),
        'cookie_samesite' => 'Lax',
        'name' => 'LEASEMASTER_SESSION',
    ]);
}

// Helper function to send JSON response
function sendJson($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Helper function to get request body as JSON
function getJsonBody() {
    $body = file_get_contents('php://input');
    
    // Empty body is OK for GET requests
    if (empty($body)) {
        return [];
    }
    
    $data = json_decode($body, true);
    
    // Check for JSON decode errors only if body is not empty
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJson(['error' => 'Invalid JSON: ' . json_last_error_msg()], 400);
    }
    
    return $data ?: [];
}

// Helper function to check authentication
function requireAuth() {
    if (!isset($_SESSION['userId'])) {
        sendJson(['error' => 'Unauthorized', 'authenticated' => false], 401);
    }
    return $_SESSION['userId'];
}

// Helper function to check tenant authentication
function requireTenant() {
    if (!isset($_SESSION['tenantId'])) {
        sendJson(['error' => 'Unauthorized', 'authenticated' => false], 401);
    }
    return $_SESSION['tenantId'];
}

// CORS headers (if needed for development)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests (only in web context, not CLI)
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

