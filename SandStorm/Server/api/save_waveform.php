<?php
require __DIR__ . '/common.php';

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) fail('Invalid JSON');

$session = clean_session($body['session'] ?? 'demo');
$peaks = $body['peaks'] ?? null;
$duration = floatval($body['duration'] ?? 0);

if (!is_array($peaks)) fail('Missing peaks array');

$safePeaks = [];
$maxPeaks = 5000;

foreach ($peaks as $p) {
    if (count($safePeaks) >= $maxPeaks) break;

    $safePeaks[] = [
        'min' => max(-1, min(1, floatval($p['min'] ?? 0))),
        'max' => max(-1, min(1, floatval($p['max'] ?? 0))),
        'rms' => max(0, min(1, floatval($p['rms'] ?? 0)))
    ];
}

$data = [
    'ok' => true,
    'session' => $session,
    'version' => round(microtime(true) * 1000),
    'duration' => $duration,
    'peaks' => $safePeaks
];

$file = session_dir($session) . '/waveform.json';
file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);

json_response([
    'ok' => true,
    'session' => $session,
    'version' => $data['version'],
    'peaks' => count($safePeaks)
]);
?>