<p align="center">
  <img src="public/moodtris.png" alt="MoodTris Logo" width="150" />
</p>

<h1 align="center">MoodTris</h1>

<p align="center">
  <strong><em>Emotion-aware Tetris</em> — the game that watches your face and adjusts the difficulty based on how you're feeling.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
</p>

---

## What is MoodTris?

MoodTris is a full-featured Tetris clone built with Next.js that uses your webcam and AI-powered facial expression recognition to dynamically adjust the game's difficulty in real time. Stressed out? The game slows down as a mercy. Zoning out? It speeds up to re-engage you.

---

## Features

- **Classic Tetris gameplay** — all 7 tetrominoes, ghost piece, hold mechanic, hard drop, soft drop, wall kicks
- **Emotion-aware difficulty** — optional webcam-based facial expression detection via `face-api.js`
  - 😰 **Stressed** (fearful + surprised + angry) → level drops by 1
  - 😑 **Disengaged** (sad + disgusted) → level bumps up by 1
  - 😊 **Calm** (neutral + happy) → level stays the same
- **Live emotion dashboard** — real-time bar graph of all 7 emotion scores grouped by their effect on difficulty
- **Camera preview** — mirrored webcam feed shown in the sidebar when mood toggle is on
- **DAS (Delayed Auto Shift)** — smooth, responsive key movement independent of OS repeat rate
- **Resume countdown** — 3-second countdown before the game resumes after pausing
- **Retro CRT aesthetic** — scanlines, phosphor flicker, green glow, pixel fonts

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
git clone https://github.com/yourusername/moodtris.git
cd moodtris
pnpm install
```

### Download Model Weights

MoodTris uses `face-api.js` for emotion detection. You need to download the model weights before the mood feature will work. Run this in PowerShell from your project root:

```powershell
New-Item -ItemType Directory -Force -Path public/models

$base = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights"
$files = @(
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_expression_model-weights_manifest.json",
  "face_expression_model-shard1"
)
foreach ($f in $files) {
  Invoke-WebRequest -Uri "$base/$f" -OutFile "public/models/$f"
  Write-Host "Downloaded $f"
}
```

### Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Controls

| Key | Action |
|-----|--------|
| `←` `→` | Move piece |
| `↑` | Rotate clockwise |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `C` / `Left Shift` | Hold piece |
| `Esc` | Pause / Resume |

---

## Scoring

| Lines Cleared | Points |
|---------------|--------|
| 1 line | 100 × level |
| 2 lines | 300 × level |
| 3 lines | 500 × level |
| 4 lines (Tetris) | 800 × level |

Level increases every **10 lines** cleared, which also speeds up the auto drop. The mood system can temporarily nudge the level up or down on top of this.

---

## Project Structure

```
moodtris/
├── app/
│   ├── globals.css       # CRT retro styles, fonts, animations
│   ├── layout.tsx        # Root layout + metadata
│   └── page.tsx          # Entry point, renders TetrisGame
├── components/
│   └── Tetris.tsx        # Main game component (canvas rendering, game loop, UI)
├── constants/
│   └── tetris.ts         # Board dimensions, colors, tetromino shapes
├── hooks/
│   └── useEmotionDetection.ts  # Webcam + face-api.js emotion detection hook
└── public/
    └── models/           # face-api.js model weights (downloaded separately)
```

---

## Tech Stack

- **[Next.js 16](https://nextjs.org/)** — React framework
- **[React 19](https://react.dev/)** — UI
- **[TypeScript](https://www.typescriptlang.org/)** — Type safety
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Styling
- **[face-api.js](https://github.com/justadudewhohacks/face-api.js)** — In-browser facial expression recognition

---

## Privacy

The mood feature is **opt-in only** — the camera is never accessed unless you explicitly toggle it on. All emotion detection runs **entirely in your browser** using TensorFlow.js. No video data is ever sent to a server.
