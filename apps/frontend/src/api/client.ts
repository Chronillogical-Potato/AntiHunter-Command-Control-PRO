const API_BASE = '/api';

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get<T>(path: string) {
    return request<T>(`${API_BASE}${path}`);
  },
  post<T, B = unknown>(path: string, body?: B) {
    return request<T>(`${API_BASE}${path}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  put<T, B = unknown>(path: string, body?: B) {
    return request<T>(`${API_BASE}${path}`, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T, B = unknown>(path: string, body?: B) {
    return request<T>(`${API_BASE}${path}`, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string) {
    return request<T>(`${API_BASE}${path}`, {
      method: 'DELETE',
    });
  },
  upload<T>(path: string, formData: FormData) {
    return request<T>(`${API_BASE}${path}`, {
      method: 'POST',
      body: formData,
    });
  },
};
