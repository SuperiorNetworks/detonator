# DETONATOR
### Sandstorm Relay Timeline — MP3-Synced Trigger Sequencer for T-Display S3
**Demolition Derby Program · Superior Networks LLC**
**David (Detroit, MI) — Firmware & Systems Engineer**
**Dwain Henderson Jr. (Dayton, OH) — Research, Documentation & Safety Lead**

> *Browser → Cloud → ESP32 → Relay fires on cue.*

[![Program](https://img.shields.io/badge/program-Demolition%20Derby-orange)](https://github.com/SuperiorNetworks/demolition-derby)
[![Status](https://img.shields.io/badge/status-Phase%201%20Active-green)](https://github.com/SuperiorNetworks/demolition-derby)
[![Live](https://img.shields.io/badge/live%20app-icssolution.net%2FSandstorm-blue)](https://icssolution.net/Sandstorm)

---

## What This Is

DETONATOR is the show-control application and ESP32 firmware for the **Demolition Derby** program. It lets you build a timed relay trigger sequence synced to an MP3 audio track, then fire that sequence live over the internet to a T-Display S3 relay board — from anywhere in the world.

**David's live deployment:** [icssolution.net/Sandstorm](https://icssolution.net/Sandstorm)

This repo contains two components:

| Component | Location | Description |
|-----------|----------|-------------|
| **Sandstorm Web App** | `web-app/` | PHP + vanilla JS browser interface — waveform editor, trigger list, live relay control |
| **ESP32 Firmware** | `firmware/sandstorm-esp32/` | Arduino sketch for T-Display S3 — polls cloud queue, fires relays on exact millisecond |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (DETONATOR UI)                │
│  Upload MP3 → Draw triggers on waveform → Send Live     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS POST
                         ▼
┌─────────────────────────────────────────────────────────┐
│              PHP SERVER (icssolution.net)                │
│  api/esp_queue.php  ←  stores command JSON per device   │
│  api/control.php    ←  session state + timing           │
│  api/load.php       ←  session load / save              │
│  api/audio.php      ←  serves uploaded MP3              │
└────────────────────────┬────────────────────────────────┘
                         │ ESP32 polls every 2s (HTTPS GET)
                         ▼
┌─────────────────────────────────────────────────────────┐
│           T-DISPLAY S3 (firmware/sandstorm-esp32)       │
│  Polls queue → receives trigger list + start epoch      │
│  Fires relay channels R1–R16 at exact millisecond       │
│  Displays status on TFT screen                          │
└─────────────────────────────────────────────────────────┘
```

### Why Cloud-Poll Instead of Direct Connection

The ESP32 cannot receive direct HTTPS connections from a browser because the device sits behind a home router with no public IP, and browsers block mixed HTTP/HTTPS requests. The server acts as a message queue — the browser posts commands to `api/esp_queue.php`, and the ESP32 polls that endpoint every 2 seconds. This means the system works from anywhere: David in Detroit, Dwain in Dayton, or any location with internet access.

---

## Repository Structure

```
detonator/
├── web-app/                        ← PHP web application (deploy to your server)
│   ├── index.html                  ← Main UI — waveform editor, trigger list, live control
│   ├── assets/
│   │   ├── app.js                  ← All frontend logic (vanilla JS)
│   │   └── style.css               ← Dark console UI styling
│   ├── api/                        ← PHP backend endpoints
│   │   ├── common.php              ← Shared helpers, base paths
│   │   ├── load.php                ← Load session (triggers + audio URL)
│   │   ├── save.php                ← Save session
│   │   ├── audio.php               ← Serve uploaded MP3
│   │   ├── upload_audio.php        ← Handle MP3 file upload
│   │   ├── control.php             ← Live control commands (start / stop)
│   │   ├── esp_queue.php           ← Cloud-poll queue for ESP32 devices
│   │   ├── manual_relay.php        ← Manual relay ON/OFF/ALL-OFF commands
│   │   ├── live_payload.php        ← Build the live trigger payload
│   │   ├── save_waveform.php       ← Cache waveform peak data
│   │   └── load_waveform.php       ← Load cached waveform
│   └── data/                       ← Runtime data (writable by PHP)
│       ├── sessions/               ← Per-session timeline + control JSON
│       ├── uploads/                ← Uploaded MP3 files
│       └── esp_queue/              ← Per-device command queue JSON
│
├── firmware/
│   └── sandstorm-esp32/
│       └── sandstorm_relay_controller.ino   ← Arduino sketch for T-Display S3
│
├── docs/
│   └── DEPLOYMENT.md               ← Server setup and deployment guide
│
└── README.md                       ← This file
```

---

## Quick Start — Web App

### Deploy to PHP Server

1. Upload the entire `web-app/` folder to your PHP-enabled web server
2. Make the data directories writable by PHP:

```bash
chmod 775 web-app/data/
chmod 775 web-app/data/sessions/
chmod 775 web-app/data/uploads/
chmod 775 web-app/data/esp_queue/
```

3. Open the app in your browser and hard-refresh: `Ctrl + F5`

### Use the App

1. Enter a session name and upload an MP3
2. Click on the waveform to place relay triggers (R1–R16)
3. Go to **Live Control** → enter device name `tdisplay1`
4. Click **Send Live Timeline**
5. The ESP32 picks up the sequence within 2 seconds and fires relays on cue

---

## Quick Start — ESP32 Firmware

1. Open `firmware/sandstorm-esp32/sandstorm_relay_controller.ino` in Arduino IDE
2. Edit the credentials at the top of the file:

```cpp
const char* WIFI_SSID   = "YOUR_WIFI_SSID";       // ← your network name
const char* WIFI_PASS   = "YOUR_WIFI_PASSWORD";    // ← your password
const char* SERVER_HOST = "icssolution.net";       // ← your server hostname
const char* DEVICE_NAME = "tdisplay1";             // ← your device name
```

3. Install required Arduino libraries:
   - `ArduinoJson`
   - `TFT_eSPI`
   - `WiFiClientSecure` (built into ESP32 Arduino core)
4. Select board: **LilyGO T-Display S3**
5. Flash and monitor serial output

> **Security note:** Never commit your actual WiFi credentials to GitHub. The credentials above are placeholders — fill them in locally and do not push the edited file.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Waveform editor** | Visual MP3 waveform with click-to-place trigger markers |
| **16-channel relay control** | Assign triggers to R1–R16 with ON/OFF actions |
| **Cloud-poll architecture** | Browser never talks directly to ESP32 — works over internet |
| **30-second buffer** | Sequence starts 30 seconds after Send — time to step back safely |
| **Manual relay control** | Fire individual relays or all-off from the Relay Monitor panel |
| **Session save/load** | Named sessions stored as JSON on the server |
| **Shared start sync** | Multiple devices can start the same sequence at the same epoch ms |
| **TFT status display** | T-Display S3 screen shows mode, relay states, and countdown |

---

## Phase 1 Relay Map (4-Channel Board)

| Relay | Phase 1 Use |
|-------|-------------|
| R1 | Structure pad 1 |
| R2 | Structure pad 2 |
| R3 | Structure pad 3 |
| R4 | Continuity test circuit |

> **Phase 2+ note:** For a full 16-relay build, an I/O expander such as MCP23017, PCF8575, or 74HC595 is strongly recommended. The firmware comment block explains the wiring approach.

---

## Test URLs (David's Live Server)

```
View queue:   https://icssolution.net/Sandstorm/api/esp_queue.php?device=tdisplay1
Clear queue:  https://icssolution.net/Sandstorm/api/clear_queue.php?device=tdisplay1
```

---

## Program Links

| Repo | Role |
|------|------|
| [demolition-derby](https://github.com/SuperiorNetworks/demolition-derby) | Master hub — six-month plan, phase gates, budget, safety |
| [detonator](https://github.com/SuperiorNetworks/detonator) | This repo — show-control app + ESP32 firmware |
| [downrange-document](https://github.com/SuperiorNetworks/downrange-document) | Sensor firmware, Python analytics, Blender pipeline |

---

## Engineers

| Engineer | Location | Role |
|----------|----------|------|
| **David** | Detroit, MI | **Firmware & Systems Engineer** — ESP32 programming, relay logic design, PHP backend, DETONATOR app development |
| **Dwain Henderson Jr.** | Dayton, OH | **Research, Documentation & Safety Lead** — build replication, testing alongside David, safety protocol |

---

*Part of the **Demolition Derby** program by Superior Networks LLC*
*Phase 1 Target: **July 10, 2026** — Both boards present, first live detonation event*
