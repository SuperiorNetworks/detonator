<?php
function json_response($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}
function fail($msg, $code = 400) { json_response(['error' => $msg], $code); }
function clean_session($s) {
    $s = preg_replace('/[^a-zA-Z0-9_-]/', '_', $s ?? 'demo');
    return $s ?: 'demo';
}
function base_data_dir() {
    return realpath(__DIR__ . '/../data') ?: (__DIR__ . '/../data');
}
function session_dir($session) {
    $dir = base_data_dir() . '/sessions/' . clean_session($session);
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    return $dir;
}
function session_file($session) { return session_dir($session) . '/timeline.json'; }
function default_timeline() {
    return [
        'version' => time(),
        'audioUrl' => '',
        'triggers' => []
    ];
}
function read_timeline($session) {
    $file = session_file($session);
    if (!file_exists($file)) {
        $d = default_timeline();
        file_put_contents($file, json_encode($d, JSON_PRETTY_PRINT), LOCK_EX);
        return $d;
    }
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? array_merge(default_timeline(), $data) : default_timeline();
}
function write_timeline($session, $data) {
    $safe = [
        'version' => time(),
        'audioUrl' => $data['audioUrl'] ?? '',
        'triggers' => []
    ];
    foreach (($data['triggers'] ?? []) as $t) {
        $relay = max(1, min(16, intval($t['relay'] ?? 1)));
        $action = strtoupper($t['action'] ?? 'ON') === 'OFF' ? 'OFF' : 'ON';
        $safe['triggers'][] = [
            'id' => preg_replace('/[^a-zA-Z0-9_-]/', '', $t['id'] ?? uniqid()),
            'time' => max(0, floatval($t['time'] ?? 0)),
            'relay' => $relay,
            'action' => $action,
            'label' => substr(trim($t['label'] ?? ''), 0, 80)
        ];
    }
    usort($safe['triggers'], fn($a,$b) => $a['time'] <=> $b['time']);
    file_put_contents(session_file($session), json_encode($safe, JSON_PRETTY_PRINT), LOCK_EX);
    return $safe;
}
?>