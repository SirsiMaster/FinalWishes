import '@testing-library/jest-dom/vitest'

// Mock Firebase modules for unit tests
vi.mock('../lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  },
  storage: {},
}))

// Mock import.meta.env
vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
