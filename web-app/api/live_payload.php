<?php
require __DIR__ . '/common.php';

$body = json_decode(file_get_contents('php://input'), true);
$session = clean_session($body['session'] ?? $_GET['session'] ?? 'demo');
$buffer = max(5, min(120, intval($body['buffer_seconds'] ?? 30)));

$data = read_timeline($session);
$startEpochMs = round(microtime(true) * 1000) + ($buffer * 1000);

$payload = [
    'type' => 'relay_timeline',
    'session' => $session,
    'server_epoch_ms' => round(microtime(true) * 1000),
    'start_epoch_ms' => $startEpochMs,
    'buffer_seconds' => $buffer,
    'audioUrl' => $data['audioUrl'],
    'triggers' => array_map(function($t){
        return [
            'time_ms' => intval(round(floatval($t['time']) * 1000)),
            'relay' => intval($t['relay']),
            'state' => strtoupper($t['action']) === 'ON' ? 1 : 0,
            'label' => $t['label'] ?? ''
        ];
    }, $data['triggers'])
];

json_response($payload);
?>