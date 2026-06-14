import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Contract guard: the memoir video upload must POST to the route the API
// actually registers — `/api/v1/memoirs/upload-video`
// (see api/cmd/api/main.go: r.Route("/api/v1/memoirs") … Post("/upload-video")).
// It previously posted to an unregistered `/api/v1/youtube/upload`, which always
// 404'd and silently broke the white-glove video-memoir feature.
describe('memoir video upload contract', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const memoirsSrc = readFileSync(
    join(here, 'estates.$estateId.memoirs.lazy.tsx'),
    'utf8'
  )

  it('posts to the registered /api/v1/memoirs/upload-video route', () => {
    expect(memoirsSrc).toContain('/api/v1/memoirs/upload-video')
  })

  it('does not post to the unregistered /api/v1/youtube/upload route', () => {
    expect(memoirsSrc).not.toContain('/api/v1/youtube/upload')
  })
})
