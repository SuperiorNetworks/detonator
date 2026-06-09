<?php
require __DIR__ . '/common.php';

function queue_dir() {
    $dir = base_data_dir() . '/esp_queue';
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    return $dir;
}
function clean_device($d) {
    $d = preg_replace('/[^a-zA-Z0-9_-]/', '_', $d ?? 'tdisplay1');
    return $d ?: 'tdisplay1';
}
function queue_file($device) {
    return queue_dir() . '/' . clean_device($device) . '.json';
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}
header('Access-Control-Allow-Origin: *');

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) fail('Invalid JSON');

    $device = clean_device($body['device'] ?? 'tdisplay1');
    $payload = $body['payload'] ?? null;
    if (!$payload) fail('Missing payload');

    $queuedAt = round(microtime(true) * 1000);

    // Force the live start time to be based on the actual queue time.
    // This guarantees a real buffer even if the browser or an old payload had stale time values.
    $bufferSeconds = intval($body['buffer_seconds'] ?? $payload['buffer_seconds'] ?? 30);
    if ($bufferSeconds < 5) $bufferSeconds = 30;
    if ($bufferSeconds > 120) $bufferSeconds = 120;

    $payload['server_epoch_ms'] = $queuedAt;
    $payload['queued_at_ms'] = $queuedAt;
    $payload['buffer_seconds'] = $bufferSeconds;
    $payload['start_epoch_ms'] = $queuedAt + ($bufferSeconds * 1000);

    $record = [
        'ok' => true,
        'device' => $device,
        'has_command' => true,
        'queued_at_ms' => $queuedAt,
        'command_id' => uniqid('cmd_', true),
        'payload' => $payload
    ];

    file_put_contents(queue_file($device), json_encode($record, JSON_PRETTY_PRINT), LOCK_EX);
    json_response($record);
}

if ($method === 'GET') {
    $device = clean_device($_GET['device'] ?? 'tdisplay1');
    $file = queue_file($device);

    if (!file_exists($file)) {
        json_response([
            'ok' => true,
            'device' => $device,
            'has_command' => false,
            'server_epoch_ms' => round(microtime(true) * 1000)
        ]);
    }

    $record = json_decode(file_get_contents($file), true);
    if (!is_array($record)) {
        json_response([
            'ok'=>true,
            'device'=>$device,
            'has_command'=>false,
            'server_epoch_ms'=>round(microtime(true)*1000)
        ]);
    }

    $record['has_command'] = true;
    $record['server_epoch_ms'] = round(microtime(true) * 1000);
    json_response($record);
}

fail('Method not allowed', 405);
?>