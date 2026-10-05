const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

/**
 * A non-2xx response from the Quadra API. `status` lets callers branch (401 →
 * refresh, 429 → "try again later"); `detail` is the backend's problem-details
 * `title` when one was returned.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string | null;

  constructor(status: number, statusText: string, detail: string | null) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function readProblemTitle(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'title' in body) {
      const title = (body as { title: unknown }).title;
      return typeof title === 'string' ? title : null;
    }
    return null;
  } catch {
    return null; // empty or non-JSON error body
  }
}

export async function apiClient<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.statusText,
      await readProblemTitle(response),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
