<?php
/**
 * Simple router for PHP built-in server.
 * - Serves API routes from /api via api/index.php
 * - Serves static files from /public
 * - Falls back to /public/index.html for SPA routes
 */

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Route /api requests to the PHP API
if (strpos($path, '/api') === 0) {
    require __DIR__ . '/api/index.php';
    return;
}

// Serve existing static files from /public
$publicFile = __DIR__ . '/public' . $path;
if ($path !== '/' && file_exists($publicFile) && !is_dir($publicFile)) {
    $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    $docRoot = rtrim(str_replace('\\', '/', $docRoot), '/');
    $publicRoot = rtrim(str_replace('\\', '/', __DIR__ . '/public'), '/');

    // If the built-in server docroot is /public, let it serve the file.
    if ($docRoot === $publicRoot) {
        return false;
    }

    // Otherwise, stream the file ourselves so /assets works regardless of docroot.
    $ext = strtolower(pathinfo($publicFile, PATHINFO_EXTENSION));
    $contentTypes = [
        'js' => 'application/javascript',
        'css' => 'text/css',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];
    if (isset($contentTypes[$ext])) {
        header('Content-Type: ' . $contentTypes[$ext]);
    }
    readfile($publicFile);
    return;
}

// SPA fallback
require __DIR__ . '/public/index.html';
