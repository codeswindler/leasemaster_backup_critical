<?php
/**
 * Create Admin User Script for Production
 * Run this once after database setup to create the initial admin user
 * 
 * Usage: php create-admin-user.php
 */

require_once __DIR__ . '/../api/config.php';

// Default admin credentials (CHANGE THESE IN PRODUCTION!)
$username = 'admin';
$password = 'admin123'; // CHANGE THIS!

// Hash the password
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

try {
    // Check if user already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    
    if ($stmt->fetch()) {
        echo "⚠️  User '$username' already exists. Skipping creation.\n";
        exit(0);
    }
    
    // Create admin user
    $stmt = $pdo->prepare("INSERT INTO users (id, username, password) VALUES (UUID(), ?, ?)");
    $stmt->execute([$username, $hashedPassword]);
    
    echo "✅ Admin user created successfully!\n";
    echo "📝 Login Credentials:\n";
    echo "   Username: $username\n";
    echo "   Password: $password\n";
    echo "\n⚠️  IMPORTANT: Change the password in production!\n";
    echo "   Update this script or change password via the admin panel.\n";
    
} catch (PDOException $e) {
    echo "❌ Error creating admin user: " . $e->getMessage() . "\n";
    exit(1);
}

