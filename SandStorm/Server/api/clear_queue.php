<?php
require __DIR__ . '/common.php';

function clean_device($d) {
    $d = preg_replace('/[^a-zA-Z0-9_-]/', '_', $d ?? 'tdisplay1');
    return $d ?: 'tdisplay1';
}

$device = clean_device($_GET['device'] ?? 'tdisplay1');
$file = base_data_dir() . '/esp_queue/' . $device . '.json';

if (file_exists($file)) {
    unlink($file);
}

json_response([
    'ok' => true,
    'device' => $device,
    'message' => 'Queue cleared',
    'server_epoch_ms' => round(microtime(true) * 1000)
]);
?>