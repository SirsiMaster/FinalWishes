# Animate the Hero Family Photo

## Source Image
`web/public/assets/images/hero-family.jpg`

## Tools (Image-to-Video)
Use one of these — upload the hero image and paste the prompt:

1. **Runway Gen-3 Alpha** — runway.ml (best quality, $15/mo)
2. **Kling AI 1.6** — klingai.com (free tier, excellent motion)
3. **Minimax (Hailuo)** — hailuoai.video (free, 6s clips)
4. **Luma Dream Machine** — lumalabs.ai (free tier)

## Animation Prompt
```
Subtle cinematic motion. The family portrait comes alive with gentle movement — warm wind softly moves hair and clothing, golden sunlight shifts across faces creating warm highlights, soft bokeh particles drift upward like fireflies in warm golden light. Camera slowly pushes in with a gentle dolly. Shallow depth of field keeps the family sharp while background softens. Warm film grain. The scene feels alive, intimate, and timeless. Maintain the original composition and warmth. 4-6 seconds, smooth loop-friendly ending.
```

## Alternative: More Dramatic Version
```
Cinematic living portrait. Start with the family photo completely still, then breath enters the scene — hair moves in gentle breeze, eyes blink naturally, children shift slightly, warm golden light slowly intensifies from the right side. Subtle lens flare crosses the frame. Golden particles begin floating upward from below. Camera very slowly dollies forward. The frozen moment becomes alive. Shallow depth of field, film grain, anamorphic. 6 seconds.
```

## After Generation

```bash
# Extract frames for scroll animation
./scripts/extract-frames.sh path/to/generated-video.mp4 24

# The landing page auto-detects frames in web/public/frames/
# Just run: npm run dev
```

## What Happens on the Landing Page

1. Page loads → ScrollVideoCanvas detects frames in `/frames/`
2. Hero shows the animated family portrait as a scroll-driven experience
3. As user scrolls, the animation "plays" — family comes alive
4. Text overlays on top: "Preserve Your Story. Protect Your People."
5. After the animation ends, the page continues to the content sections
6. **If no frames exist** → falls back to the static hero image (current behavior)

No code changes needed — the landing page already handles both states.
