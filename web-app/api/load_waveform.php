<?php
require __DIR__ . '/common.php';

$session = clean_session($_GET['session'] ?? 'demo');
$file = session_dir($session) . '/waveform.json';

if (!file_exists($file)) {
    json_response([
        'ok' => true,
        'session' => $session,
        'has_waveform' => false,
        'peaks' => []
    ]);
}

$data = json_decode(file_get_contents($file), true);
if (!is_array($data)) {
    json_response([
        'ok' => true,
        'session' => $session,
        'has_waveform' => false,
        'peaks' => []
    ]);
}

$data['has_waveform'] = true;
json_response($data);
?>