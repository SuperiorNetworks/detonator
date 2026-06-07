# BLACKOUT — Show Control Editor

> *Design the sequence. Arm the system. Execute.*

**Part of the [Iron District](https://github.com/SuperiorNetworks/showctrl-lab) project.**  
**Built by DJ (Dayton, OH) and David (Detroit, MI)**

---

## What Is BLACKOUT?

BLACKOUT is a browser-based show-control editor built for the **ESP32 T-Display S3**. It lets you design a cue list of relay triggers synchronized to an audio track, simulate the show visually using before/after sprite images, monitor IP cameras, run continuity tests, and execute the show through a gated multi-step approval workflow. When you're done, it exports a `.tdproj` file that the microcontroller reads directly.

The interface is built around an **Industrial Dark Console** design language — near-black background, amber LED-style relay indicators, JetBrains Mono throughout, and a status banner that turns amber when armed and red when the E-Stop fires.

---

## Features

| Tab | What It Does |
|-----|-------------|
| **Project** | Create, load, and save `.tdproj` files. Set project name, description, and audio URL. |
| **Timeline** | Place relay triggers on a millisecond-resolution audio timeline. Scrub, play, and watch relay states update in real time. |
| **Visuals** | Configure up to 5 sprite groups. Each group links to a relay channel and swaps between a before/after image when the relay fires. |
| **Cameras** | Monitor up to 2 IP/MJPEG cameras. View live streams and capture snapshots. |
| **Relay Test** | Run a simulated continuity test across all 16 relay channels. Identify open circuits before arming. |
| **Live Control** | Execute the full show workflow: Load → Simulation → Continuity → Approval → Arm → Countdown → Execute. |
| **Logs** | Timestamped event log for every system action, relay state change, and error. |

---

## Show Workflow

```
STANDBY → LOAD PROJECT → SIMULATION → CONTINUITY TEST → APPROVAL → ARM → COUNTDOWN → EXECUTE
```

The E-Stop button is always visible. One click halts playback, disables all 16 relay outputs, and locks the system into E-STOP mode until manually reset.

---

## Hardware Target

- **Microcontroller:** ESP32 T-Display S3 ([LilyGO product page](https://www.lilygo.cc/products/t-display-s3))
- **Relay module:** 16-channel, active-low, GPIO-driven
- **Relay channels:** R1–R15 (effects), R16 (continuity test loop)
- **Export format:** `.tdproj` JSON — see [docs/data-schema.md](https://github.com/SuperiorNetworks/groundwork-collapse-lab/blob/main/docs/data-schema.md)

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/SuperiorNetworks/blackout-show-control.git
cd blackout-show-control

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open `http://localhost:3000` in your browser.

---

## Project File Format

BLACKOUT exports and imports `.tdproj` files — plain JSON with the following top-level structure:

```json
{
  "projectName": "The District Falls",
  "description": "Final show run — 8 structures, 60-second sequence",
  "audioUrl": "https://ftp.sndaten.com/irondistrict/audio/final.mp3",
  "sensorDataUrl": "https://ftp.sndaten.com/irondistrict/phase5/",
  "timeline": [ ... ],
  "sprites": [ ... ],
  "cameras": [ ... ],
  "relayConfig": [ ... ]
}
```

Full schema documentation lives in the [GROUNDWORK repo](https://github.com/SuperiorNetworks/groundwork-collapse-lab/blob/main/docs/data-schema.md).

---

## Data Sync

Project files and sensor data are synced to `ftp.sndaten.com/irondistrict/` using the workflow documented in the [GROUNDWORK sync guide](https://github.com/SuperiorNetworks/groundwork-collapse-lab/blob/main/host-tools/sync/README.md).

---

## Related Projects

| Repo | Description |
|------|-------------|
| [Iron District (master hub)](https://github.com/SuperiorNetworks/showctrl-lab) | Six-month project plan, Gantt, budget, phase gates |
| [GROUNDWORK](https://github.com/SuperiorNetworks/groundwork-collapse-lab) | Sensor firmware, Python analytics, Blender simulation pipeline |

---

## Tech Stack

- React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui component library
- Wouter (client-side routing)
- Framer Motion (animations)
- Recharts (data visualization)
- Vite 7

---

## License

MIT — see [LICENSE](LICENSE)
