# Landing Page Components — Developer README

## Architecture

```
components/landing/
├── ProductShowcase.tsx     # Auto-rotating screenshot carousel (8 tabs, 15s interval)
├── ScrollVideoCanvas.tsx   # Apple-style scroll-driven frame animation
└── README.md               # This file
```

These components live on the public landing page (`web/src/routes/index.tsx`). They are not behind authentication.

---

## ProductShowcase

Auto-rotating carousel that cycles through 8 product screenshots in a browser-chrome frame. Each tab shows a screenshot, caption, and description.

### Tabs
| Tab | Screenshot | Route Shown |
|-----|-----------|-------------|
| Dashboard | `/assets/screenshots/dashboard.png` | `/estates/dashboard` |
| Soul Log | `/assets/screenshots/soul-log.png` | `/estates/soul-log` |
| Document Vault | `/assets/screenshots/vault.png` | `/estates/vault` |
| Assets | `/assets/screenshots/assets.png` | `/estates/assets` |
| Directives | `/assets/screenshots/directives.png` | `/estates/directives` |
| My People | `/assets/screenshots/beneficiaries.png` | `/estates/people` |
| Time Capsules | `/assets/screenshots/timecapsule.png` | `/estates/timecapsule` |
| Digital Lockbox | `/assets/screenshots/lockbox.png` | `/estates/lockbox` |

### Behavior
- **Auto-rotate:** 15 seconds per tab
- **Pause on hover:** Timer pauses when mouse enters the carousel
- **Click:** Clicking a tab pauses auto-rotate for 10s, then resumes
- **Preloading:** All 8 screenshots are preloaded on mount for instant transitions
- **Transitions:** Framer Motion crossfade (500ms ease-in-out)
- **Progress bar:** CSS animation (`tabProgress`, 15s linear) on the active tab

### Dependencies
- `framer-motion` — crossfade animation between screenshots
- `lib/utils.ts` — `cn()` for classname merging

---

## ScrollVideoCanvas

Apple-style scroll-driven video: as the user scrolls, a `<canvas>` renders the corresponding frame from a pre-extracted image sequence.

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `frameCount` | `number` | — | Total number of frames in the sequence |
| `framePath` | `string` | `'/frames/frame-%04d.jpg'` | URL pattern (`%04d` = zero-padded frame number) |
| `scrollHeight` | `number` | `500` | Scroll area height in `vh` units |

### Usage
1. Generate a brand video (Runway/Kling/Minimax)
2. Extract frames: `ffmpeg -i video.mp4 -vf "fps=18" public/frames/frame-%04d.jpg`
3. Pass `frameCount` to the component

### Implementation
- Sticky canvas stays in viewport while the scroll container passes through
- `requestAnimationFrame` throttling on scroll handler
- HiDPI-aware: canvas scaled by `window.devicePixelRatio`
- `object-fit: cover` behavior computed manually for canvas drawing

### Current State
Framework is in place but waiting on a brand video (Owner Action Item #6). The component renders a loading bar until frames are available.
