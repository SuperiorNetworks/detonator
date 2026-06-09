# DEPLOYMENT GUIDE
## DETONATOR — Sandstorm Web App

**Author:** David (Detroit, MI) — Firmware & Systems Engineer
**Program:** Demolition Derby · Superior Networks LLC

---

## Server Requirements

| Requirement | Minimum |
|-------------|---------|
| PHP | 7.4 or higher |
| Web server | Apache or Nginx with HTTPS |
| Disk space | 500 MB (for MP3 uploads) |
| SSL certificate | Required — ESP32 uses HTTPS polling |

---

## Upload Steps

1. Upload the entire `web-app/` folder to your server root or a subdirectory (e.g., `/Sandstorm/`)
2. Set directory permissions:

```bash
chmod 775 data/
chmod 775 data/sessions/
chmod 775 data/uploads/
chmod 775 data/esp_queue/
```

3. Confirm PHP can write to those directories:

```bash
php -r "file_put_contents('data/test.txt', 'ok'); echo file_get_contents('data/test.txt');"
# Should output: ok
```

---

## ESP32 Server Configuration

In the firmware, update these values to match your server:

```cpp
const char* SERVER_HOST  = "icssolution.net";   // your domain, no https://
const char* SERVER_PATH  = "/Sandstorm/api/esp_queue.php";
const char* DEVICE_NAME  = "tdisplay1";          // unique per board
```

---

## Useful Test URLs

Replace `icssolution.net/Sandstorm` with your own domain if self-hosting:

| Purpose | URL |
|---------|-----|
| View device queue | `https://icssolution.net/Sandstorm/api/esp_queue.php?device=tdisplay1` |
| Clear device queue | `https://icssolution.net/Sandstorm/api/clear_queue.php?device=tdisplay1` |
| Load demo session | `https://icssolution.net/Sandstorm/api/load.php?session=demo` |

---

## Session Data Location

Sessions are stored as JSON files on the server:

```
data/sessions/{session-name}/timeline.json   ← trigger list + audio URL
data/sessions/{session-name}/control.json    ← live control state
data/sessions/{session-name}/waveform.json   ← cached waveform peaks
data/uploads/{session-name}/audio.mp3        ← uploaded MP3
data/esp_queue/{device-name}.json            ← pending command for ESP32
```

---

## Important: Use Device Name, Not IP Address

When entering the device in Live Control, use the device name only:

```
✅ tdisplay1
❌ 10.0.0.54
❌ http://10.0.0.54
```

The site is HTTPS. Browsers block HTTPS pages from posting directly to local HTTP ESP devices. The cloud-poll architecture routes all commands through the server.

---

*Last updated: June 2026 — David*
