<?php
require __DIR__ . '/common.php';

$session = clean_session($_GET['session'] ?? 'demo');
$file = base_data_dir() . '/uploads/' . $session . '/audio.mp3';

if (!file_exists($file)) {
    http_response_code(404);
    exit('Audio file not found');
}

$size = filesize($file);
$start = 0;
$end = $size - 1;

header('Content-Type: audio/mpeg');
header('Accept-Ranges: bytes');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if (isset($_SERVER['HTTP_RANGE'])) {
    if (preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
        if ($m[1] !== '') $start = intval($m[1]);
        if ($m[2] !== '') $end = intval($m[2]);
    }

    if ($start > $end || $start >= $size) {
        header("Content-Range: bytes */$size");
        http_response_code(416);
        exit;
    }

    $end = min($end, $size - 1);
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$size");
} else {
    http_response_code(200);
}

$length = $end - $start + 1;
header("Content-Length: $length");

$fp = fopen($file, 'rb');
fseek($fp, $start);

$buffer = 8192;
while (!feof($fp) && $length > 0) {
    $read = min($buffer, $length);
    echo fread($fp, $read);
    flush();
    $length -= $read;
}
fclose($fp);
exit;
?>