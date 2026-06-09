<?php
require __DIR__ . '/common.php';
$body = json_decode(file_get_contents('php://input'), true);
if (!$body) fail('Invalid JSON');
$session = clean_session($body['session'] ?? 'demo');
$data = write_timeline($session, $body);
json_response($data);
?>