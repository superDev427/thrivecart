import type { BasketItem, Catalogue, Quote } from './types';

const serviceUnavailableMessage =
  'The shop is not responding right now. Please try again in a moment.';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
};

async function requestJson<T>(path: string, { method = 'GET', body, signal }: RequestOptions) {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    throw new ApiError(serviceUnavailableMessage, 0);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(errorMessageFrom(payload) ?? serviceUnavailableMessage, response.status);
  }

  if (payload === null) {
    throw new ApiError(serviceUnavailableMessage, response.status);
  }

  return payload as T;
}

function errorMessageFrom(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || !('error' in payload)) {
    return null;
  }

  const { error } = payload;

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return typeof error.message === 'string' ? error.message : null;
  }

  return null;
}

export function describeError(error: unknown): string {
  return error instanceof ApiError ? error.message : serviceUnavailableMessage;
}

export function fetchCatalogue(signal?: AbortSignal): Promise<Catalogue> {
  return requestJson<Catalogue>('/api/products', { signal });
}

export function fetchQuote(items: BasketItem[], signal?: AbortSignal): Promise<Quote> {
  return requestJson<Quote>('/api/basket/quote', {
    method: 'POST',
    body: { items: items.map(({ code, quantity }) => ({ code, quantity })) },
    signal,
  });
}
