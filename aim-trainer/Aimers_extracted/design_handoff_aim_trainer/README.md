# Handoff: Aimers — Web Aim Trainer (Wireframes)

## Overview
A web-based aim trainer in the spirit of Aimlabs and Kovaaks: training drills (gridshot, flick, tracking, target switching, reflex, spray), a mode catalog, in-game HUD, post-run results, stats/progression, and a first-run onboarding+calibration flow.

The bundled design is a **wireframe / low-fidelity exploration**: 5 screens × 4 distinct variations each, laid out on a pannable design canvas. Use it to pick the directions you like before committing to a single hi-fi pass.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended structure, layout, and behavior. They are **not production code to copy directly**.

Your task is to **recreate these HTML designs in your target codebase's existing environment** (React, Vue, Svelte, etc.) using its established patterns and libraries. If you don't yet have an environment, pick the framework that best fits the project (for a real-time aim trainer with input-latency requirements: plain Vite + TypeScript + Canvas/WebGL for gameplay, React or Solid for menus is a reasonable default).

## Fidelity
**Low-fidelity (lofi) — wireframes.**

These mocks define **structure, hierarchy, copy, and the information shown on each screen**. The visual treatment (graphite surfaces, neon accent, mono numerals, hairline borders, corner brackets, dotted playfield) is a **directional sample** of what a "minimal gamer pro-tool" aesthetic might feel like — feel free to evolve it during the hi-fi pass. Use the layouts and content as the spec; treat the visual styling as a starting point.

## Screens / Views

### ① Main menu / mode select (4 variations)
Purpose: pick a drill and start a run.

- **A · Catalog grid** — sectioned grid of drill cards (Fundamentals / Gun-game / Custom). Each card: 3-letter code, drill name, type tag, "BEST" personal best, last-played timestamp, target-pattern thumbnail. One "featured" card is taller with a CTA.
- **B · List + detail** — left column is a categorized list of drills (with PB and play count); right column is a detail pane showing the selected drill: stats, a 2-up benchmark vs your last 5 runs, and a big "▸ start" button.
- **C · Home feed** — vertical feed: "Continue training" (resume yesterday's playlist), "Recommended" (3 drill chips with reasoning), "Daily challenge" (timer + reward), "Friends" (mini leaderboard row).
- **D · ⌘K launcher ✦** — minimal screen with a single command palette. Typing filters drills, modes, settings, and friends. Shows keyboard-shortcut hints and recent commands.

### ② In-game HUD (4 variations)
Purpose: the screen the user sees while shooting.

All variants share: a dot-grid playfield, a center crosshair, a small set of live stats. They differ in **how much chrome surrounds the playfield**.

- **A · Minimal corners** — the only chrome is four corner brackets with: time-remaining (top-left), score (top-right), accuracy% (bottom-left), streak (bottom-right). Nothing else.
- **B · Crosshair gauges** — small radial gauges orbit the crosshair: accuracy ring, current streak ring, time-remaining arc. Stats follow the eye.
- **C · Dense rail** — a 56px left rail shows: time, score, hits/total, accuracy, avg TTK (time to kill), best streak. For users who want everything visible.
- **D · Shot timeline ✦** — slim horizontal strip at the bottom: each shot is a colored tick (green=hit / red=miss / yellow=overshoot). Live "ghost shot" indicator shows where your last shot landed relative to the target.

### ③ Results / score screen (4 variations)
Purpose: post-run debrief + reward + "go again".

- **A · Big-number hero** — huge centered score; below it: rank earned, delta vs PB, three KPIs in a row (accuracy, avg TTK, max streak). Primary CTAs: "▸ play again", "next drill".
- **B · Stats breakdown** — score on the left, a 6-row stats table on the right (hits, misses, accuracy, TTK avg, TTK best, longest streak), and a "consistency" sparkline of TTK over the run.
- **C · Vs last 10** — score header with a bar chart of your last 10 runs (today's bar highlighted), a "trend" indicator (↑/→/↓), and recommended next drill.
- **D · Per-shot replay ✦** — playfield with every target shown as a hollow circle, every shot as a dot, connecting lines showing reticle path. Scrubber timeline below to step through the run shot-by-shot.

### ④ Stats & progression (4 variations)
Purpose: the meta-game — track improvement.

- **A · Sparkline dash** — a grid of KPIs (overall rating, accuracy, TTK, sessions this week), each with a tiny sparkline. Below: an "areas to improve" list.
- **B · Heatmap weakness** — a hit-density heatmap on a playfield silhouette (where you miss most). Side panel lists drills that target those weak zones.
- **C · Streak calendar** — GitHub-style calendar of training days, current streak counter, longest streak, total minutes trained.
- **D · Radar + ladder ✦** — 6-axis radar chart of skills (flicking / tracking / switching / micro-adjust / reflex / consistency) with your shape vs the "next rank" shape. Below: rank ladder with your position and the gap to the next tier.

### ⑤ Onboarding & calibration (4 variations)
Purpose: first-run setup.

- **A · Sens drag** — calibrate sensitivity by dragging the mouse 180° between two markers; auto-computes cm/360° from DPI and in-game sens.
- **B · Skill assessment** — 4 self-rated levels (beginner / intermediate / advanced / elite) with descriptive sub-copy. Selection sets default drill difficulty.
- **C · Pick your games** — multi-select grid of FPS titles (Valorant, CS2, Apex, Overwatch, Marvel Rivals, Other). Tunes recommended drills.
- **D · Live benchmark ✦** — instead of asking, give them a 30-second test. Live score climbs, end-screen shows predicted skill level, recommended drills, sens fit.

## Interactions & Behavior

### Gameplay loop (in-game HUD)
- Targets spawn on the playfield based on the drill type (static grid, single-target flick, moving track, etc.)
- Left-click registers a shot at the crosshair's screen position
- Hit detection: distance from click to target center vs target radius
- On hit: target disappears, +1 to score, +1 to streak, new target spawns (mode-dependent)
- On miss: streak resets to 0, miss counter +1
- Run ends on timer expiry (default 60s) or target-count limit
- Transition to results screen with summary stats

### Navigation flows
- Onboarding → Main menu (first run only; thereafter skipped)
- Main menu → In-game (start button or drill card click)
- In-game → Results (run completes)
- Results → Main menu OR → In-game (play again / next drill)
- Stats accessible from main menu rail

### Microinteractions
- Crosshair lock-on subtle scale animation when hovering a target
- Score increments with a quick count-up (~150ms)
- Streak counter pulses on every +1
- Run-end transition: 300ms fade from HUD to results
- Tweaks panel: corner brackets, dotted playfield grid, mono numerals on every metric

### Loading / empty / error states
- Loading the gameplay engine: dotted playfield with `INIT...` text in the center
- Empty stats (first-run): "play a drill to see your numbers"
- Failed input capture (pointer-lock denied): banner asking the user to click to capture cursor

## State Management
At minimum:

- **profile**: username, level, rating, preferred games, sens config (DPI, in-game sens, cm/360°)
- **session**: current drill, run state (idle / countdown / running / ended), elapsed, score, hits, misses, streak, max streak, shot log
- **history**: array of completed runs (drill, score, timestamp, KPIs, optional shot log for replay)
- **prefs**: theme (graphite/platinum), accent color, density, HUD variant, corner-brackets on/off

Performance-sensitive state (cursor position, target list, per-frame scoring) should live outside the React tree — use refs or a Canvas/WebGL renderer. Only push score / accuracy / streak into React state at most ~10×/sec.

## Design Tokens

### Theme — graphite (default)
| Token | Value |
|---|---|
| `--bg` | `#07090b` |
| `--bg-2` | `#0d1014` |
| `--bg-3` | `#12171c` |
| `--bg-4` | `#181e25` |
| `--line` | `rgba(255,255,255,0.06)` |
| `--line-2` | `rgba(255,255,255,0.12)` |
| `--line-3` | `rgba(255,255,255,0.22)` |
| `--text` | `#e7eaef` |
| `--text-2` | `rgba(231,234,239,0.62)` |
| `--text-3` | `rgba(231,234,239,0.36)` |
| `--accent` (default) | `#c8ff00` (acid lime) |
| `--accent` alts | `#22e6ff` cyan, `#ff3df0` magenta, `#ff7a1a` orange |
| `--danger` | `#ff5d5d` |

### Theme — platinum (light alt)
Same structure; swap `--bg` to `#f4f5f6`, `--text` to `#0d1014`, lines to `rgba(0,0,0,0.x)`. See `wireframes/gx.css`.

### Typography
- Display / UI: **Space Grotesk** (400/500/600/700)
- Numerals / labels / metrics: **JetBrains Mono** (400/500/600) — use mono for ALL numbers, timer, rank codes, drill codes, percentages
- Labels: uppercase, letter-spacing ~0.06em, size 10–11px, color `--text-3`
- Body: 12–13px
- Display heading: 22–32px depending on screen

### Spacing
- Base: 4px scale (4 / 8 / 12 / 16 / 24 / 32)
- Card padding: 12–18px
- Screen padding: 16–20px
- Topbar height: 30px

### Borders / radius
- Hairline borders everywhere: 1px solid `--line` or `--line-2`
- Radius is **flat / low**: 2–4px on cards, 0 on full-bleed sections — this is intentional, the aesthetic is pro-tool, not soft consumer
- Corner brackets on the playfield are pure CSS pseudo-elements (see `.playfield::before`)

### Shadows
- No drop shadows. The aesthetic is flat. Depth comes from line weight and surface tone.

## Assets
- **Fonts**: Space Grotesk + JetBrains Mono, both Google Fonts (free, open-licensed). Self-host for production.
- **No images / icons**: every glyph in the wireframes is either text, a CSS shape, or inline SVG. Replace placeholder dot-grid playfields with your real Canvas/WebGL renderer.
- **No third-party UI kit**: build native components in your framework.

## Files
- `Aim Trainer Wireframes.html` — entrypoint, mounts the design canvas with all 20 wireframes
- `wireframes/gx.css` — all design tokens + component classes (cards, buttons, playfield, targets, charts, topbar)
- `wireframes/common.jsx` — shared primitives: `TopBar`, `ChartLine`, `ChartArea`, `Sparkline`, `Bar`, `Radar`, `spotsForSeed` (deterministic target positions)
- `wireframes/menu.jsx` — `Menu_A`–`Menu_D`
- `wireframes/hud.jsx` — `HUD_A`–`HUD_D`
- `wireframes/results.jsx` — `Results_A`–`Results_D`
- `wireframes/stats.jsx` — `Stats_A`–`Stats_D`
- `wireframes/onboarding.jsx` — `Onboard_A`–`Onboard_D`
- `design-canvas.jsx` / `tweaks-panel.jsx` — scaffolding for the design preview itself; you do NOT need to port these.

## Open questions for the implementer
- Which HUD variant ships first? (Recommended: **A · Minimal corners** — lowest cognitive load during gameplay, easiest to A/B against B once you have telemetry.)
- Pointer-lock vs free-cursor? Aim trainers usually use pointer-lock to mimic FPS feel; this requires a "click to begin" gate and a graceful exit on Esc.
- Render target: **Canvas 2D** is sufficient for static/flick/track drills and gives you sub-ms input latency. WebGL only if you want 3D target geometry.
- Where do replays live? Localstorage for the last N runs is enough for v1; only persist server-side once you have accounts.
