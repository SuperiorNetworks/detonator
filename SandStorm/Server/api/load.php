<?php
require __DIR__ . '/common.php';
$session = clean_session($_GET['session'] ?? 'demo');
$since = intval($_GET['since'] ?? 0);
$data = read_timeline($session);
$data['changed'] = ($since === 0 || intval($data['version']) > $since);
json_response($data);
?>