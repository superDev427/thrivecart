import type { BasketItem } from '../api/types';

export const basketStorageKey = 'acme-widget-co:basket';

export function loadStoredBasket(): BasketItem[] {
  try {
    const stored = window.localStorage.getItem(basketStorageKey);

    return stored === null ? [] : parseStoredBasket(JSON.parse(stored));
  } catch {
    return [];
  }
}

export function storeBasket(items: BasketItem[]): boolean {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(basketStorageKey);
    } else {
      window.localStorage.setItem(basketStorageKey, JSON.stringify({ version: 1, items }));
    }

    return true;
  } catch {
    return false;
  }
}

export function parseStoredBasket(value: unknown): BasketItem[] {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.items)) {
    return [];
  }

  const quantities = new Map<string, number>();

  for (const item of value.items) {
    if (!isRecord(item)) {
      continue;
    }

    const { code, quantity } = item;

    if (typeof code !== 'string' || code.trim() === '') {
      continue;
    }

    if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1) {
      continue;
    }

    quantities.set(code, (quantities.get(code) ?? 0) + quantity);
  }

  return Array.from(quantities, ([code, quantity]) => ({ code, quantity }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
