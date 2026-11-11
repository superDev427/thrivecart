import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import type { BasketItem } from './api/types';
import { basketStorageKey } from './basket/storage';
import { formatMoney } from './format';
import { installFakeShop, jsonResponse, syntheticQuote, testCatalogue } from './test/fakeShop';

const money = (cents: number) => formatMoney(cents, 'USD');

function summary() {
  return screen.getByRole('region', { name: 'Order summary' });
}

function summaryValue(label: string) {
  return within(summary()).getByText(label, { selector: 'dt' }).nextElementSibling;
}

function basketPanel() {
  return screen.getByRole('region', { name: 'Your basket' });
}

describe('Acme Widget Co storefront', () => {
  it('builds a basket and renders the quote returned by the backend', async () => {
    const shop = installFakeShop();
    const user = userEvent.setup();
    render(<App />);

    const addRed = await screen.findByRole('button', { name: 'Add to basket: Red Widget' });
    await user.click(addRed);
    await user.click(addRed);
    await user.click(screen.getByRole('button', { name: 'Add to basket: Blue Widget' }));

    const twoRedOneBlue = syntheticQuote([
      { code: 'R01', quantity: 2 },
      { code: 'B01', quantity: 1 },
    ]);
    await waitFor(() =>
      expect(summaryValue('Total')).toHaveTextContent(money(twoRedOneBlue.totalCents)),
    );
    expect(summaryValue('Products')).toHaveTextContent(money(twoRedOneBlue.subtotalCents));
    expect(summaryValue('Offer savings')).toHaveTextContent(
      `−${money(twoRedOneBlue.discountCents)}`,
    );
    expect(summaryValue('Subtotal after offers')).toHaveTextContent(
      money(twoRedOneBlue.discountedSubtotalCents),
    );
    expect(summaryValue('Delivery')).toHaveTextContent(money(777));
    expect(screen.getByRole('list', { name: 'Offers applied' })).toHaveTextContent(
      'Buy one Red Widget, get the second half price',
    );
    expect(
      within(basketPanel()).getByText(
        (_, element) =>
          element?.tagName === 'P' && element.textContent === 'Add $12.34 more for free delivery.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Basket, 3 items' })).toHaveAttribute(
      'href',
      '#basket',
    );

    await user.click(screen.getByRole('button', { name: 'Increase Blue Widget quantity' }));
    const twoRedTwoBlue = syntheticQuote([
      { code: 'R01', quantity: 2 },
      { code: 'B01', quantity: 2 },
    ]);
    await waitFor(() =>
      expect(summaryValue('Total')).toHaveTextContent(money(twoRedTwoBlue.totalCents)),
    );

    const decreaseRed = screen.getByRole('button', { name: 'Decrease Red Widget quantity' });
    await user.click(decreaseRed);
    expect(decreaseRed).toHaveAttribute('aria-disabled', 'true');
    await user.click(decreaseRed);
    expect(
      within(basketPanel()).getByRole('group', { name: 'Red Widget quantity' }),
    ).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: 'Remove Red Widget from basket' }));
    const twoBlue = syntheticQuote([{ code: 'B01', quantity: 2 }]);
    await waitFor(() => expect(summaryValue('Total')).toHaveTextContent(money(twoBlue.totalCents)));

    expect(
      screen.queryByRole('button', { name: 'Remove Red Widget from basket' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Offers applied' })).not.toBeInTheDocument();
    expect(screen.getByText('Red Widget removed from your basket.')).toBeInTheDocument();
    expect(shop.quoteRequests.at(-1)).toEqual([{ code: 'B01', quantity: 2 }]);
    expect(
      shop.quoteRequests.flat().every((item) => Object.keys(item).join() === 'code,quantity'),
    ).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(basketStorageKey) ?? 'null')).toEqual({
      version: 1,
      items: [{ code: 'B01', quantity: 2 }],
    });

    await user.click(screen.getByRole('button', { name: 'Clear basket' }));
    expect(screen.getByText('Your basket is empty')).toBeInTheDocument();
    expect(window.localStorage.getItem(basketStorageKey)).toBeNull();
  });

  it('keeps the selection and offers a retry when the quote cannot be calculated', async () => {
    const shop = installFakeShop();
    shop.respondToQuotesWith(async () =>
      jsonResponse(
        {
          error: {
            code: 'server_error',
            message: 'Something went wrong on our side. Please try again.',
          },
        },
        500,
      ),
    );
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Add to basket: Green Widget' }));

    expect(await screen.findByText("We couldn't update your totals.")).toBeInTheDocument();
    expect(screen.getByText('Totals unavailable')).toBeInTheDocument();
    expect(summaryValue('Total')).toHaveTextContent('Unavailable');
    expect(
      within(basketPanel()).getByRole('heading', { name: 'Green Widget' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Your basket totals could not be updated.')).toBeInTheDocument();

    shop.respondToQuotesWith(async (items) => jsonResponse(syntheticQuote(items)));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    const oneGreen = syntheticQuote([{ code: 'G01', quantity: 1 }]);
    await waitFor(() =>
      expect(summaryValue('Total')).toHaveTextContent(money(oneGreen.totalCents)),
    );
    expect(screen.queryByText("We couldn't update your totals.")).not.toBeInTheDocument();
  });

  it('cancels superseded quote requests and ignores their late responses', async () => {
    const shop = installFakeShop();
    const pending: Array<{ signal: AbortSignal | null; resolve: () => void }> = [];
    shop.respondToQuotesWith(
      (items: BasketItem[], signal) =>
        new Promise((resolve) => {
          pending.push({ signal, resolve: () => resolve(jsonResponse(syntheticQuote(items))) });
        }),
    );
    const user = userEvent.setup();
    render(<App />);

    const addRed = await screen.findByRole('button', { name: 'Add to basket: Red Widget' });
    await user.click(addRed);
    await user.click(addRed);
    await waitFor(() => expect(pending).toHaveLength(2));

    expect(pending[0]?.signal?.aborted).toBe(true);
    expect(pending[1]?.signal?.aborted).toBe(false);
    expect(summary()).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Updating totals…')).toBeInTheDocument();

    await act(async () => pending[1]?.resolve());
    const twoRed = syntheticQuote([{ code: 'R01', quantity: 2 }]);
    await waitFor(() => expect(summaryValue('Total')).toHaveTextContent(money(twoRed.totalCents)));

    await act(async () => pending[0]?.resolve());
    const oneRed = syntheticQuote([{ code: 'R01', quantity: 1 }]);
    expect(summaryValue('Total')).toHaveTextContent(money(twoRed.totalCents));
    expect(summaryValue('Total')).not.toHaveTextContent(money(oneRed.totalCents));
    expect(summary()).toHaveAttribute('aria-busy', 'false');
  });

  it('restores valid saved items and requests a fresh quote for them', async () => {
    window.localStorage.setItem(
      basketStorageKey,
      JSON.stringify({
        version: 1,
        items: [
          { code: 'G01', quantity: 2 },
          { code: 'X99', quantity: 1 },
          { code: 'B01', quantity: 'many' },
        ],
        totalCents: 1,
      }),
    );
    const shop = installFakeShop();
    render(<App />);

    const twoGreen = syntheticQuote([{ code: 'G01', quantity: 2 }]);
    await waitFor(() =>
      expect(summaryValue('Total')).toHaveTextContent(money(twoGreen.totalCents)),
    );
    expect(shop.quoteRequests).toEqual([[{ code: 'G01', quantity: 2 }]]);
  });

  it('starts with an empty basket when saved data is malformed', async () => {
    window.localStorage.setItem(basketStorageKey, '{not json');
    const shop = installFakeShop();
    render(<App />);

    expect(
      await screen.findByRole('button', { name: 'Add to basket: Red Widget' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Your basket is empty')).toBeInTheDocument();
    expect(shop.quoteRequests).toHaveLength(0);
  });

  it('lets the shopper retry when the catalogue cannot be loaded', async () => {
    const shop = installFakeShop();
    shop.respondToCatalogueWith(async () => {
      throw new TypeError('Failed to fetch');
    });
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("We couldn't load our widgets.")).toBeInTheDocument();

    shop.respondToCatalogueWith(async () => jsonResponse(testCatalogue));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('button', { name: 'Add to basket: Red Widget' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Second one half price')).toBeInTheDocument();
  });
});
