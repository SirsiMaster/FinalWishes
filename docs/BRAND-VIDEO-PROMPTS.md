# FinalWishes Brand Video — AI Generation Prompts

Use these prompts with **Runway Gen-3 Alpha**, **Kling AI**, or **Minimax (Hailuo)**.
Generate each scene as a separate 4-second clip, then stitch them with ffmpeg.

## Color Palette (include in every prompt)
- Deep royal blue: #0A1628
- Metallic gold: #C8A951
- Warm white: #F5F0E8

---

## Scene 1: Genesis (4s)
**Prompt:**
```
Cinematic slow motion. Thousands of golden luminous particles floating in deep navy blue darkness, slowly converging and coalescing into the silhouette of a multigenerational family — grandparents, parents, children standing together. Particles trail golden light as they move. Deep bokeh background. Anamorphic lens flare. Film grain. Color palette: deep navy blue (#0A1628) background, warm metallic gold (#C8A951) particles. 4K, photorealistic, dramatic lighting.
```

## Scene 2: The Vault (4s)
**Prompt:**
```
Cinematic slow dolly forward. A massive Art Deco vault door in deep navy blue and brushed gold, ornate geometric patterns etched into the surface. The vault door slowly swings open, revealing warm golden volumetric light pouring out from within. Dust particles catch the light. Camera pushes through the doorway into the light. Luxurious, permanent, guardian-like aesthetic. Film grain, shallow depth of field. Color palette: deep royal blue metal with gold accents. 4K.
```

## Scene 3: Legacy Documents (4s)
**Prompt:**
```
Cinematic top-down view. Elegant cream parchment documents with gold wax seals being carefully arranged on a dark navy blue leather surface. A golden pen rests beside them. Warm side lighting creates long shadows. Documents gently slide into perfect alignment as if organized by an invisible careful hand. Shallow depth of field, macro detail on the wax seal texture. Art Deco gold border frames visible at edges. Film grain. 4K.
```

## Scene 4: The Growing Tree (4s)
**Prompt:**
```
Cinematic time-lapse style. A majestic golden tree growing from rich dark soil, roots spreading deep underground while branches reach upward. Each leaf is luminous metallic gold catching warm light. Background transitions from deep navy blue darkness to a warm golden dawn. Particles of light drift upward from the leaves like fireflies. Symbolizing legacy, growth, permanence. Volumetric fog, film grain. Color palette: navy blue to gold gradient. 4K.
```

## Scene 5: Shield Formation (4s)
**Prompt:**
```
Cinematic slow motion. Fragments of golden light and geometric Art Deco shapes converging from all directions, assembling into a luminous shield emblem in the center of frame. The shield glows with warm metallic gold light against a deep royal blue background. Once formed, a subtle pulse of light radiates outward. Minimal, powerful, iconic. Shallow depth of field, lens flare. Final frame holds on the completed shield. Film grain, anamorphic. 4K.
```

---

## Post-Production

### Stitch clips together:
```bash
# Concatenate all 5 clips into one 20-second brand video
ffmpeg -f concat -safe 0 -i clips.txt -c copy brand-video.mp4
```

Where `clips.txt` contains:
```
file 'scene1-genesis.mp4'
file 'scene2-vault.mp4'
file 'scene3-documents.mp4'
file 'scene4-tree.mp4'
file 'scene5-shield.mp4'
```

### Extract frames for scroll animation:
```bash
# Extract frames at 18fps (yields ~360 frames for 20s video)
ffmpeg -i brand-video.mp4 -vf "fps=18,scale=1920:1080" public/frames/frame-%04d.jpg
```

### Optimize frame file sizes:
```bash
# Compress frames to ~50KB each for fast loading
for f in public/frames/*.jpg; do
  convert "$f" -quality 75 -resize 1920x1080 "$f"
done
```

---

## Alternative: Single-Scene Approach

If you want one continuous 10-15 second video instead of 5 stitched scenes:

**Prompt:**
```
Cinematic continuous camera movement. Begin in deep navy blue darkness with floating golden particles. Camera slowly dollies forward as particles coalesce into a family silhouette. Continue pushing through into a warm golden light emanating from an Art Deco vault door. Inside, elegant documents with gold wax seals are arranged on dark leather. Camera tilts upward to reveal a majestic golden tree growing, leaves catching light, roots visible below. Final frame: tree transforms into a luminous golden shield emblem. Seamless transitions, volumetric lighting, film grain, anamorphic lens. Color palette: deep navy blue with metallic gold accents. 4K, 15 seconds.
```

---

## Tools Ranked by Quality for This Style

1. **Runway Gen-3 Alpha Turbo** — Best cinematic quality, $15/mo, 4s clips
2. **Kling AI 1.6** — Excellent for abstract/particle effects, free tier available
3. **Minimax (Hailuo)** — Great cinematic quality, free, 6s clips
4. **Luma Dream Machine** — Good for abstract, smooth motion

Generate 2-3 variations of each scene and pick the best.
