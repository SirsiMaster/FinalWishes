// FinalWishes Shared — API Client
// Used by web, mobile, and desktop apps

const API_BASE = process.env.API_URL || 'https://api.finalwishes.app/v1';

interface ApiResponse<T> {
  data: T;
  meta: { request_id: string; timestamp: string };
}

interface ApiError {
  error: { code: string; message: string; details: unknown[] };
  meta: { request_id: string; timestamp: string };
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error.message);
  }

  const result: ApiResponse<T> = await response.json();
  return result.data;
}

// Estate API
export const estateApi = {
  list: (token: string) => apiClient<unknown[]>('/estates', {}, token),
  get: (id: string, token: string) => apiClient<unknown>(`/estates/${id}`, {}, token),
  create: (data: unknown, token: string) =>
    apiClient<unknown>('/estates', { method: 'POST', body: JSON.stringify(data) }, token),
};

// Asset API
export const assetApi = {
  list: (estateId: string, token: string) =>
    apiClient<unknown[]>(`/estates/${estateId}/assets`, {}, token),
  create: (estateId: string, data: unknown, token: string) =>
    apiClient<unknown>(`/estates/${estateId}/assets`, { method: 'POST', body: JSON.stringify(data) }, token),
};
