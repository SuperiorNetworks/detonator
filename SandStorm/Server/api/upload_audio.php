<?php
require __DIR__ . '/common.php';
$session = clean_session($_POST['session'] ?? 'demo');
if (!isset($_FILES['audio'])) fail('No audio file uploaded');

$f = $_FILES['audio'];
if ($f['error'] !== UPLOAD_ERR_OK) fail('Upload error');

$ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['mp3','mpeg'])) fail('Only MP3 files are allowed');

$dir = base_data_dir() . '/uploads/' . $session;
if (!is_dir($dir)) mkdir($dir, 0775, true);

$target = $dir . '/audio.mp3';
if (!move_uploaded_file($f['tmp_name'], $target)) fail('Could not save audio');

$audioUrl = 'api/audio.php?session=' . rawurlencode($session);

$data = read_timeline($session);
$data['audioUrl'] = $audioUrl;
$data = write_timeline($session, $data);

json_response(['ok'=>true, 'audioUrl'=>$audioUrl, 'version'=>$data['version']]);
?>