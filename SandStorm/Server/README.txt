Sandstorm Relay Timeline - Updated Full Server Code

Install:
1. Upload this folder contents into:
   https://icssolution.net/Sandstorm/
2. Make sure these folders are writable by PHP:
   data/
   data/sessions/
   data/uploads/
   data/esp_queue/
3. Hard refresh browser:
   Ctrl + F5

Important Live Control:
Use device name only:
   tdisplay1

Do NOT use:
   10.0.0.54
   http://10.0.0.54

Reason:
Your site is HTTPS. Browsers block HTTPS pages from posting directly to local HTTP ESP devices.
This server uses cloud-poll:
Browser -> api/esp_queue.php
T-Display S3 -> polls api/esp_queue.php?device=tdisplay1

Useful test URLs:
https://icssolution.net/Sandstorm/api/esp_queue.php?device=tdisplay1
https://icssolution.net/Sandstorm/api/clear_queue.php?device=tdisplay1

After uploading:
1. Open page.
2. Live Control should show tdisplay1.
3. Click Send Live Timeline.
4. Device status should say Queued for tdisplay1.
