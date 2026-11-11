import { useEffect, useMemo, useState } from 'react';
import { describeError, fetchQuote } from '../api/client';
import type { BasketItem, Catalogue, Quote } from '../api/types';
import { loadStoredBasket, storeBasket } from './storage';

export type QuoteState =
  | { status: 'empty' }
  | { status: 'updating'; previousQuote: Quote | null }
  | { status: 'ready'; quote: Quote }
  | { status: 'failed'; message: string };

type QuoteResult = { requestKey: string } & ({ quote: Quote } | { errorMessage: string });

export type Basket = ReturnType<typeof useBasket>;

export function useBasket(catalogue: Catalogue | null) {
  const [selectedItems, setSelectedItems] = useState<BasketItem[]>(loadStoredBasket);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const items = useMemo(
    () => (catalogue === null ? selectedItems : availableItems(selectedItems, catalogue)),
    [selectedItems, catalogue],
  );
  const requestKey = `${attempt}:${JSON.stringify(items)}`;
  const canRequestQuote = catalogue !== null && items.length > 0;
  const maximumQuantity = catalogue?.maximumQuantityPerProduct ?? 0;

  useEffect(() => {
    storeBasket(items);
  }, [items]);

  useEffect(() => {
    if (!canRequestQuote) {
      return;
    }

    const controller = new AbortController();

    fetchQuote(items, controller.signal).then(
      (quote) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, quote });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, errorMessage: describeError(error) });
          setAnnouncement('Your basket totals could not be updated.');
        }
      },
    );

    return () => controller.abort();
  }, [items, requestKey, canRequestQuote]);

  const nameOf = (code: string) =>
    catalogue?.products.find((product) => product.code === code)?.name ?? code;

  const quantityOf = (code: string) => items.find((item) => item.code === code)?.quantity ?? 0;

  const changeItems = (nextItems: BasketItem[], message: string) => {
    setSelectedItems(nextItems);
    setAnnouncement(message);

    if (nextItems.length === 0) {
      setResult(null);
    }
  };

  const updateQuantity = (code: string, quantity: number, message: string) => {
    if (quantity >= 1 && quantity <= maximumQuantity) {
      changeItems(withQuantity(items, code, quantity), message);
    }
  };

  const add = (code: string) => {
    const quantity = quantityOf(code) + 1;
    updateQuantity(code, quantity, `${nameOf(code)} added to your basket. Quantity ${quantity}.`);
  };

  const increase = (code: string) => {
    const quantity = quantityOf(code) + 1;
    updateQuantity(code, quantity, `${nameOf(code)} quantity increased to ${quantity}.`);
  };

  const decrease = (code: string) => {
    const quantity = quantityOf(code) - 1;
    updateQuantity(code, quantity, `${nameOf(code)} quantity decreased to ${quantity}.`);
  };

  const remove = (code: string) => {
    changeItems(
      items.filter((item) => item.code !== code),
      `${nameOf(code)} removed from your basket.`,
    );
  };

  const clear = () => {
    changeItems([], 'Your basket is now empty.');
  };

  return {
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    maximumQuantity,
    quoteState: quoteStateFor(items, result, requestKey),
    announcement,
    add,
    increase,
    decrease,
    remove,
    clear,
    retry: () => setAttempt((current) => current + 1),
  };
}

function availableItems(items: BasketItem[], catalogue: Catalogue): BasketItem[] {
  const knownCodes = new Set(catalogue.products.map((product) => product.code));

  return items
    .filter((item) => knownCodes.has(item.code))
    .map((item) => ({
      code: item.code,
      quantity: Math.min(item.quantity, catalogue.maximumQuantityPerProduct),
    }));
}

function withQuantity(items: BasketItem[], code: string, quantity: number): BasketItem[] {
  if (!items.some((item) => item.code === code)) {
    return [...items, { code, quantity }];
  }

  return items.map((item) => (item.code === code ? { code, quantity } : item));
}

function quoteStateFor(
  items: BasketItem[],
  result: QuoteResult | null,
  requestKey: string,
): QuoteState {
  if (items.length === 0) {
    return { status: 'empty' };
  }

  if (result === null || result.requestKey !== requestKey) {
    return {
      status: 'updating',
      previousQuote: result !== null && 'quote' in result ? result.quote : null,
    };
  }

  return 'quote' in result
    ? { status: 'ready', quote: result.quote }
    : { status: 'failed', message: result.errorMessage };
}
