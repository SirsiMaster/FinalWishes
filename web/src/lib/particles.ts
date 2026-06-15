/**
 * FinalWishes Particle Burst
 *
 * Golden particle explosion for success states (create estate, sign doc, etc.).
 * Extracted from animations.tsx so that file only exports components — keeping
 * Fast Refresh working (react-refresh/only-export-components).
 */

export function useParticleBurst() {
  const burst = (x: number, y: number) => {
    const count = 20
    const container = document.createElement('div')
    container.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999`
    document.body.appendChild(container)

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div')
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const velocity = 80 + Math.random() * 120
      const size = 4 + Math.random() * 6
      const hue = 40 + Math.random() * 20 // gold range

      particle.style.cssText = `
        position:absolute;
        left:${x}px;top:${y}px;
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:hsl(${hue}, 70%, 55%);
        pointer-events:none;
        will-change:transform,opacity;
      `
      container.appendChild(particle)

      const dx = Math.cos(angle) * velocity
      const dy = Math.sin(angle) * velocity

      particle.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy + 40}px) scale(0)`, opacity: 0 },
        ],
        {
          duration: 600 + Math.random() * 400,
          easing: 'cubic-bezier(0, 0.9, 0.57, 1)',
          fill: 'forwards',
        }
      )
    }

    setTimeout(() => container.remove(), 1200)
  }

  return burst
}
