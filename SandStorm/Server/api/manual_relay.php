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

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) fail('Invalid JSON');

$device = clean_device($body['device'] ?? 'tdisplay1');
$command = $body['command'] ?? 'relay';

$queuedAt = round(microtime(true) * 1000);

$payload = [
    'type' => 'manual_relay',
    'session' => clean_session($body['session'] ?? 'demo'),
    'server_epoch_ms' => $queuedAt,
    'queued_at_ms' => $queuedAt,
    'start_epoch_ms' => $queuedAt,
    'command' => $command
];

if ($command === 'relay') {
    $relay = max(1, min(16, intval($body['relay'] ?? 1)));
    $state = intval($body['state'] ?? 0) ? 1 : 0;
    $payload['relay'] = $relay;
    $payload['state'] = $state;
} elseif ($command === 'all_off') {
    $payload['state'] = 0;
} else {
    fail('Unknown manual relay command');
}

$record = [
    'ok' => true,
    'device' => $device,
    'has_command' => true,
    'queued_at_ms' => $queuedAt,
    'command_id' => uniqid('manual_', true),
    'payload' => $payload
];

file_put_contents(queue_file($device), json_encode($record, JSON_PRETTY_PRINT), LOCK_EX);

json_response($record);
?>