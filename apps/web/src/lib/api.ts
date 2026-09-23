/**
 * Cliente HTTP do navegador. Fala com /api (mesma origem — o Next repassa para a API),
 * enviando o cookie de sessão automaticamente.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }

  /** Erros por campo (validação) no formato { campo: mensagem } */
  get fields(): Record<string, string> {
    return this.details && typeof this.details === 'object' && !Array.isArray(this.details)
      ? (this.details as Record<string, string>)
      : {};
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
};

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = opts.body || opts.form ? 'POST' : 'GET', body, form, signal } = opts;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: form ? undefined : body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError('Não foi possível conectar. Verifique sua internet.', 0, 'NETWORK');
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(err?.message ?? 'Algo deu errado. Tente novamente.', res.status, err?.code, err?.details);
  }
  return data as T;
}

export const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Algo deu errado. Tente novamente.';
