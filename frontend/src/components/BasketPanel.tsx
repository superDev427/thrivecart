import { useRef } from 'react';
import type { Catalogue } from '../api/types';
import type { Basket } from '../basket/useBasket';
import type { CatalogueState } from '../catalogue/useCatalogue';
import { formatItemCount, formatMoney } from '../format';
import { BasketLineItem } from './BasketLineItem';
import { DeliveryProgress } from './DeliveryProgress';
import { TagIcon } from './icons';
import { OrderSummary } from './OrderSummary';
import { useFitsInViewport } from './useFitsInViewport';

type BasketPanelProps = {
  catalogueState: CatalogueState;
  basket: Basket;
};

export function BasketPanel({ catalogueState, basket }: BasketPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fitsInViewport = useFitsInViewport(panelRef, 24);

  const focusHeading = () => headingRef.current?.focus({ preventScroll: true });

  return (
    <section
      id="basket"
      ref={panelRef}
      className="basket"
      aria-labelledby="basket-heading"
      data-sticky={fitsInViewport}
    >
      <div className="basket__header">
        <h2 id="basket-heading" ref={headingRef} tabIndex={-1}>
          Your basket
        </h2>
        <span className="basket__count">{formatItemCount(basket.itemCount)}</span>
        {basket.items.length > 0 && (
          <button
            type="button"
            className="button button--quiet basket__clear"
            onClick={() => {
              basket.clear();
              focusHeading();
            }}
          >
            Clear basket
          </button>
        )}
      </div>

      <BasketBody
        catalogueState={catalogueState}
        basket={basket}
        onRemove={(code) => {
          basket.remove(code);
          focusHeading();
        }}
      />
    </section>
  );
}

type BasketBodyProps = {
  catalogueState: CatalogueState;
  basket: Basket;
  onRemove: (code: string) => void;
};

function BasketBody({ catalogueState, basket, onRemove }: BasketBodyProps) {
  if (basket.items.length === 0) {
    return <EmptyBasket />;
  }

  if (catalogueState.status === 'loading') {
    return (
      <div className="basket__body" aria-hidden="true">
        <div className="skeleton skeleton--row" />
        <div className="skeleton skeleton--row" />
      </div>
    );
  }

  if (catalogueState.status === 'failed') {
    return (
      <p className="basket__notice">Your saved widgets will appear here once the shop loads.</p>
    );
  }

  return (
    <BasketContents catalogue={catalogueState.catalogue} basket={basket} onRemove={onRemove} />
  );
}

type BasketContentsProps = {
  catalogue: Catalogue;
  basket: Basket;
  onRemove: (code: string) => void;
};

function BasketContents({ catalogue, basket, onRemove }: BasketContentsProps) {
  const { quoteState } = basket;
  const quote =
    quoteState.status === 'ready'
      ? quoteState.quote
      : quoteState.status === 'updating'
        ? quoteState.previousQuote
        : null;
  const pending = quoteState.status === 'updating';
  const currency = catalogue.currency;

  return (
    <div className="basket__body" data-stale={quoteState.status !== 'ready'}>
      <ul className="basket-lines">
        {basket.items.map((item) => {
          const product = catalogue.products.find((candidate) => candidate.code === item.code);

          return (
            product && (
              <BasketLineItem
                key={item.code}
                product={product}
                quantity={item.quantity}
                line={quote?.lines.find((line) => line.code === item.code) ?? null}
                pending={pending}
                currency={currency}
                maximumQuantity={basket.maximumQuantity}
                onIncrease={() => basket.increase(item.code)}
                onDecrease={() => basket.decrease(item.code)}
                onRemove={() => onRemove(item.code)}
              />
            )
          );
        })}
      </ul>

      {quote !== null && quote.appliedOffers.length > 0 && (
        <ul className="offer-list" aria-label="Offers applied">
          {quote.appliedOffers.map((offer) => (
            <li key={`${offer.productCode}-${offer.description}`} className="offer-list__item">
              <TagIcon />
              <span className="offer-list__text">
                {offer.description}
                {offer.timesApplied > 1 && (
                  <span className="offer-list__times"> × {offer.timesApplied}</span>
                )}
              </span>
              <span className="offer-list__amount money">
                −{formatMoney(offer.discountCents, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {quoteState.status !== 'failed' && <DeliveryProgress quote={quote} currency={currency} />}

      <OrderSummary
        quoteState={quoteState}
        quote={quote}
        currency={currency}
        onRetry={basket.retry}
      />
    </div>
  );
}

function EmptyBasket() {
  return (
    <div className="basket-empty">
      <svg className="basket-empty__art" viewBox="0 0 96 32" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r="11" />
        <path d="M48 5.5 60 26.5H36Z" />
        <rect x="69" y="5" width="22" height="22" rx="4" />
      </svg>
      <p className="basket-empty__title">Your basket is empty</p>
      <p className="basket-empty__text">Add a widget to see offers, delivery and your total.</p>
    </div>
  );
}
