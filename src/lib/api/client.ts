const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

/**
 * A non-2xx response from the Quadra API. `status` lets callers branch (401 →
 * refresh, 429 → "try again later"); `detail` is the backend's problem-details
 * `title` when one was returned.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string | null;
  /** The problem's machine-readable `code` (e.g. `photo_refused`), when the backend sends one. */
  readonly code: string | null;

  constructor(status: number, statusText: string, detail: string | null, code: string | null = null) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

/** The `title` and `code` of a problem-details body; null for what is missing. */
async function readProblem(response: Response): Promise<{ title: string | null; code: string | null }> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) {
      return { title: null, code: null };
    }
    const { title, code } = body as { title?: unknown; code?: unknown };
    return {
      title: typeof title === 'string' ? title : null,
      code: typeof code === 'string' ? code : null,
    };
  } catch {
    return { title: null, code: null }; // empty or non-JSON error body
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
    const problem = await readProblem(response);
    throw new ApiError(response.status, response.statusText, problem.title, problem.code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
