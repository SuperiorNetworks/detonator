# Show Control Editor — Design Brainstorm

<response>
<probability>0.07</probability>
<text>
## Idea A — Industrial Dark Console

**Design Movement:** Industrial HMI / Broadcast Control Room Aesthetic

**Core Principles:**
- Every pixel earns its place — no decorative chrome, only functional density
- Monochrome base with single-hue accent (amber) for active/armed states
- Horizontal scan-line texture on panels to evoke CRT broadcast monitors
- Information hierarchy through weight and luminance contrast, not color variety

**Color Philosophy:** Near-black (#0d0e10) backgrounds, dark-steel panels (#1a1c20), amber (#f59e0b) for active relays and armed state, red (#ef4444) for E-stop and fail states. Muted green (#22c55e) for pass/continuity. The palette reads "professional broadcast rack" not "consumer app."

**Layout Paradigm:** Persistent left sidebar for project/nav, full-width horizontal timeline ruler pinned below the top bar, right panel for relay/property inspector. Tabs live in the top bar as compact pill buttons. No centered hero sections.

**Signature Elements:**
- Amber LED-style dot indicators on each relay channel
- Horizontal waveform/timeline ruler with tick marks at every 100ms
- Monospace font (JetBrains Mono) for all time values and relay IDs

**Interaction Philosophy:** Every action has an immediate visual confirmation. Armed state changes the entire header accent strip to amber. E-stop turns it red. No ambiguity about system state.

**Animation:** State transitions 120ms ease-out. Timeline scrubber drags with no lag. Relay LED blink on activation: 80ms on, 80ms off, then hold.

**Typography System:** JetBrains Mono for data/time values; Inter for UI labels; bold weight for section headers; regular for body.
</text>
</response>

<response>
<probability>0.06</probability>
<text>
## Idea B — Glassmorphic Night Stage

**Design Movement:** Glassmorphism + Stage Lighting Aesthetic

**Core Principles:**
- Frosted glass panels over a deep indigo gradient background
- Color bleeds from relay state into surrounding UI (active relay glows its assigned color)
- Asymmetric card layout with overlapping depth layers
- Motion as a first-class design element — everything slides, fades, or pulses

**Color Philosophy:** Deep indigo (#0f0c29 → #302b63) gradient base, white-glass panels at 12% opacity with 1px white border, relay channels assigned distinct hue accents from a curated palette (cyan, violet, rose, amber, emerald).

**Layout Paradigm:** Two-column split: left 60% is the timeline/canvas, right 40% is a floating inspector panel. Tabs rendered as icon-only vertical rail on the far left.

**Signature Elements:**
- Relay channel cards with soft glow matching channel color
- Timeline with gradient-filled cue blocks (not just lines)
- Frosted modal overlays for approval/arm workflow

**Interaction Philosophy:** Hover states bloom outward. Active states pulse. The arm/countdown sequence triggers a full-screen overlay with a radial countdown ring.

**Animation:** Entrance animations 200ms with stagger. Relay activation: scale(1.02) + glow expand 150ms. Modal: blur-in from center 250ms.

**Typography System:** Sora (display, bold) for headings; DM Sans for body; tabular-nums for all time displays.
</text>
</response>

<response>
<probability>0.05</probability>
<text>
## Idea C — Precision Engineering Dashboard

**Design Movement:** Swiss Grid / Technical Blueprint Aesthetic

**Core Principles:**
- Strict 8px grid, no exceptions
- Blueprint-blue on white for the editor; inverted to white-on-dark for live/armed mode
- Typography-driven hierarchy — size and weight carry all meaning, no decorative elements
- Borders and rules as structural elements, not decoration

**Color Philosophy:** White (#ffffff) base, blueprint blue (#1d4ed8) for primary actions and active states, slate (#64748b) for secondary UI, red (#dc2626) for destructive/E-stop. Zero gradients in editor mode; a subtle blue-to-dark gradient only in live mode.

**Layout Paradigm:** Full-width top navigation with tab labels. Below: three-panel layout — narrow left rail (project tree), wide center (timeline/canvas), narrow right (inspector). No floating panels.

**Signature Elements:**
- Thin 1px blue rule separating every major section
- Relay channels displayed as a numbered grid (like a patch bay)
- Blueprint-style crosshair cursor in the visual canvas

**Interaction Philosophy:** Clicks are instant. No gratuitous animation. Keyboard shortcuts for every action. The UI respects the operator's focus.

**Animation:** Minimal — only opacity transitions at 100ms. Timeline scrub is pixel-perfect. No entrance animations.

**Typography System:** IBM Plex Mono for all data; IBM Plex Sans for UI; strict size scale: 11px labels, 13px body, 16px section headers, 24px page titles.
</text>
</response>

---

## Selected Approach: **Idea A — Industrial Dark Console**

This approach best matches the professional show-control context. The amber/dark palette communicates system state clearly, the monospace data display is appropriate for timing-critical relay work, and the broadcast-rack aesthetic gives the tool credibility and visual distinction without being flashy.
