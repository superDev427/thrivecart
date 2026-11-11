import { vi } from 'vitest';
import type { BasketItem, Catalogue, Quote } from '../api/types';

export const testCatalogue: Catalogue = {
  currency: 'USD',
  maximumQuantityPerProduct: 99,
  products: [
    {
      code: 'R01',
      name: 'Red Widget',
      unitPriceCents: 3295,
      promotions: ['Second one half price'],
    },
    { code: 'G01', name: 'Green Widget', unitPriceCents: 2495, promotions: [] },
    { code: 'B01', name: 'Blue Widget', unitPriceCents: 795, promotions: [] },
  ],
};

export function syntheticQuote(items: BasketItem[]): Quote {
  const lines = items.map(({ code, quantity }) => {
    const product = testCatalogue.products.find((candidate) => candidate.code === code);

    if (product === undefined) {
      throw new Error(`Unexpected product ${code} in test quote.`);
    }

    const subtotalCents = product.unitPriceCents * quantity;
    const discountCents = code === 'R01' ? Math.floor(quantity / 2) * 1001 : 0;

    return {
      code,
      name: product.name,
      quantity,
      unitPriceCents: product.unitPriceCents,
      subtotalCents,
      discountCents,
      totalCents: subtotalCents - discountCents,
    };
  });

  const subtotalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0);
  const discountCents = lines.reduce((sum, line) => sum + line.discountCents, 0);
  const pairs = Math.floor((items.find((item) => item.code === 'R01')?.quantity ?? 0) / 2);

  return {
    currency: 'USD',
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    lines,
    appliedOffers:
      pairs > 0
        ? [
            {
              productCode: 'R01',
              description: 'Buy one Red Widget, get the second half price',
              timesApplied: pairs,
              discountCents,
            },
          ]
        : [],
    subtotalCents,
    discountCents,
    discountedSubtotalCents: subtotalCents - discountCents,
    deliveryCents: 777,
    nextDeliveryTier: { thresholdCents: 20000, deliveryCents: 0, remainingCents: 1234 },
    totalCents: subtotalCents - discountCents + 777,
  };
}

type QuoteResponder = (items: BasketItem[], signal: AbortSignal | null) => Promise<Response>;

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function installFakeShop() {
  const quoteRequests: BasketItem[][] = [];
  let respondToQuote: QuoteResponder = async (items) => jsonResponse(syntheticQuote(items));
  let respondToCatalogue = async () => jsonResponse(testCatalogue);

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.endsWith('/api/products')) {
      return respondToCatalogue();
    }

    if (url.endsWith('/api/basket/quote')) {
      const { items } = JSON.parse(String(init?.body)) as { items: BasketItem[] };
      quoteRequests.push(items);

      return respondToQuote(items, init?.signal ?? null);
    }

    return jsonResponse({ error: { code: 'not_found', message: 'Not found.' } }, 404);
  });

  vi.stubGlobal('fetch', fetchMock);

  return {
    quoteRequests,
    respondToQuotesWith(responder: QuoteResponder) {
      respondToQuote = responder;
    },
    respondToCatalogueWith(responder: () => Promise<Response>) {
      respondToCatalogue = responder;
    },
  };
}
