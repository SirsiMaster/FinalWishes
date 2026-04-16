import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient, type Interceptor } from "@connectrpc/connect";
import { EstateService } from "../gen/estate/v1/estate_pb";
import { auth } from './firebase';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const baseUrl = isLocal ? "http://localhost:8080" : (import.meta.env.VITE_API_URL || "");

/**
 * Auth interceptor — injects Firebase ID token as Bearer header on every request.
 * Fails gracefully if no user is signed in (some endpoints are public).
 */
const authInterceptor: Interceptor = (next) => async (req) => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      req.header.set("Authorization", `Bearer ${token}`);
    }
  } catch {
    // Non-blocking — request proceeds without auth header
  }
  return next(req);
};

/**
 * Retry interceptor — retries failed requests with exponential backoff.
 * Only retries on network errors and 503 (service unavailable), not on
 * auth errors (401/403) or validation errors (400).
 */
const retryInterceptor: Interceptor = (next) => async (req) => {
  const MAX_RETRIES = 2;
  const BASE_DELAY_MS = 500;

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await next(req);
    } catch (err: unknown) {
      lastError = err;
      // Only retry on network errors or 503 (Cloud Run cold start)
      const isRetryable = err instanceof Error && (
        err.message.includes('fetch failed') ||
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('[unavailable]') ||
        err.message.includes('[resource_exhausted]')
      );

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw err;
      }

      // Exponential backoff: 500ms, 1000ms
      await new Promise(resolve => setTimeout(resolve, BASE_DELAY_MS * Math.pow(2, attempt)));
    }
  }
  throw lastError;
};

const transport = createConnectTransport({
  baseUrl,
  interceptors: [authInterceptor, retryInterceptor],
});

export const estateClient = createClient(EstateService, transport);

/**
 * API base URL for traditional REST endpoints (guidance, payments, etc.)
 * ConnectRPC endpoints use the transport above; REST endpoints use this URL directly.
 */
export const API_BASE = baseUrl || '';
