import { useEffect, useRef, useState } from 'react'

interface ScrollVideoCanvasProps {
  /** Total number of frames in public/frames/ */
  frameCount: number
  /** Path pattern — use %d for frame number (1-indexed). Default: '/frames/frame-%04d.jpg' */
  framePath?: string
  /** Height of the scroll area in viewport heights. Default: 500 (5x screen height) */
  scrollHeight?: number
}

/**
 * ScrollVideoCanvas — Apple-style scroll-driven frame animation.
 *
 * As the user scrolls, the canvas renders the corresponding frame from a
 * pre-extracted image sequence, creating a "playing video by scrolling" effect.
 *
 * Usage:
 *   1. Generate a brand video using AI (Runway/Kling/Minimax)
 *   2. Extract frames: ffmpeg -i video.mp4 -vf "fps=18" public/frames/frame-%04d.jpg
 *   3. Count the frames and pass frameCount to this component
 *   4. The component handles preloading, canvas rendering, and scroll binding
 */
export function ScrollVideoCanvas({
  frameCount,
  framePath = '/frames/frame-%04d.jpg',
  scrollHeight = 500,
}: ScrollVideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const [loadProgress, setLoadProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const rafRef = useRef<number | null>(null)

  // Build frame URL from pattern
  const getFrameUrl = (index: number): string => {
    const padded = String(index).padStart(4, '0')
    return framePath.replace('%04d', padded)
  }

  // Preload all frames
  useEffect(() => {
    let loadedCount = 0
    const images: HTMLImageElement[] = []

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image()
      img.src = getFrameUrl(i)
      img.onload = () => {
        loadedCount++
        setLoadProgress(Math.round((loadedCount / frameCount) * 100))
        if (loadedCount === frameCount) {
          setLoaded(true)
          // Draw first frame
          drawFrame(0)
        }
      }
      img.onerror = () => {
        loadedCount++
        setLoadProgress(Math.round((loadedCount / frameCount) * 100))
      }
      images.push(img)
    }

    imagesRef.current = images

    return () => {
      // Cleanup
      imagesRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCount])

  // Draw a specific frame index to the canvas
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const img = imagesRef.current[index]
    if (!canvas || !ctx || !img || !img.complete) return

    // Set canvas size to match container
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Draw image covering the canvas (object-fit: cover behavior)
    const imgRatio = img.naturalWidth / img.naturalHeight
    const canvasRatio = rect.width / rect.height
    let drawWidth: number, drawHeight: number, drawX: number, drawY: number

    if (imgRatio > canvasRatio) {
      drawHeight = rect.height
      drawWidth = drawHeight * imgRatio
      drawX = (rect.width - drawWidth) / 2
      drawY = 0
    } else {
      drawWidth = rect.width
      drawHeight = drawWidth / imgRatio
      drawX = 0
      drawY = (rect.height - drawHeight) / 2
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
  }

  // Bind scroll position to frame index
  useEffect(() => {
    if (!loaded) return

    const handleScroll = () => {
      if (rafRef.current) return

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const container = containerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const containerTop = rect.top
        const containerHeight = rect.height
        const viewportHeight = window.innerHeight

        // Calculate scroll progress through the container (0 to 1)
        const scrollProgress = Math.max(
          0,
          Math.min(1, -containerTop / (containerHeight - viewportHeight))
        )

        // Map to frame index
        const frameIndex = Math.min(
          frameCount - 1,
          Math.floor(scrollProgress * frameCount)
        )

        drawFrame(frameIndex)
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial draw

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, frameCount])

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: `${scrollHeight}vh` }}
    >
      {/* Sticky canvas — stays in viewport while container scrolls */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: loaded ? 'block' : 'none' }}
        />

        {/* Loading indicator */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A1628]">
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-[#C8A951] rounded-full transition-all duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <span className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase">
              Loading Experience {loadProgress}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
