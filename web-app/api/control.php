<?php
require __DIR__ . '/common.php';

function control_file($session) {
    return session_dir($session) . '/control.json';
}
function default_control() {
    return [
        'version' => 0,
        'mode' => 'idle',
        'command_id' => '',
        'server_epoch_ms' => round(microtime(true) * 1000),
        'start_epoch_ms' => 0,
        'start_audio_time' => 0,
        'buffer_seconds' => 5
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $session = clean_session($_GET['session'] ?? 'demo');
    $file = control_file($session);
    if (!file_exists($file)) json_response(default_control());
    $data = json_decode(file_get_contents($file), true);
    if (!is_array($data)) $data = default_control();
    $data['server_epoch_ms'] = round(microtime(true) * 1000);
    json_response($data);
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) fail('Invalid JSON');

$session = clean_session($body['session'] ?? 'demo');
$action = $body['action'] ?? 'status';
$file = control_file($session);

$control = default_control();
if (file_exists($file)) {
    $old = json_decode(file_get_contents($file), true);
    if (is_array($old)) $control = array_merge($control, $old);
}

if ($action === 'simulate_start') {
    $buffer = max(1, min(30, intval($body['buffer_seconds'] ?? 5)));
    $now = round(microtime(true) * 1000);
    $control = [
        'version' => time(),
        'mode' => 'simulate',
        'command_id' => uniqid('sim_', true),
        'server_epoch_ms' => $now,
        'start_epoch_ms' => $now + ($buffer * 1000),
        'start_audio_time' => max(0, floatval($body['start_audio_time'] ?? 0)),
        'buffer_seconds' => $buffer
    ];
    file_put_contents($file, json_encode($control, JSON_PRETTY_PRINT), LOCK_EX);
    json_response($control);
}


if ($action === 'live_audio_start') {
    $now = round(microtime(true) * 1000);
    $startEpoch = intval($body['start_epoch_ms'] ?? ($now + 30000));
    $control = [
        'version' => time(),
        'mode' => 'live_audio',
        'command_id' => uniqid('audio_', true),
        'server_epoch_ms' => $now,
        'start_epoch_ms' => $startEpoch,
        'start_audio_time' => max(0, floatval($body['start_audio_time'] ?? 0)),
        'buffer_seconds' => max(1, intval(($startEpoch - $now) / 1000))
    ];
    file_put_contents($file, json_encode($control, JSON_PRETTY_PRINT), LOCK_EX);
    json_response($control);
}

if ($action === 'stop') {
    $now = round(microtime(true) * 1000);
    $control['version'] = time();
    $control['mode'] = 'stop';
    $control['command_id'] = uniqid('stop_', true);
    $control['server_epoch_ms'] = $now;
    $control['start_epoch_ms'] = $now;
    file_put_contents($file, json_encode($control, JSON_PRETTY_PRINT), LOCK_EX);
    json_response($control);
}

json_response($control);
?>