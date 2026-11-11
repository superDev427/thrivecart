import type { CSSProperties } from 'react';
import type { Quote } from '../api/types';
import { formatMoney } from '../format';
import { TruckIcon } from './icons';

export function DeliveryProgress({ quote, currency }: { quote: Quote | null; currency: string }) {
  if (quote === null) {
    return <div className="delivery delivery--placeholder" aria-hidden="true" />;
  }

  const nextTier = quote.nextDeliveryTier;

  if (nextTier === null && quote.deliveryCents > 0) {
    return null;
  }

  const progress =
    nextTier === null ? 1 : Math.min(quote.discountedSubtotalCents / nextTier.thresholdCents, 1);

  return (
    <div className="delivery" data-unlocked={nextTier === null}>
      <p className="delivery__message">
        <TruckIcon />
        {nextTier === null ? (
          <span>
            You've unlocked <strong>free delivery</strong>.
          </span>
        ) : (
          <span>
            Add <strong className="money">{formatMoney(nextTier.remainingCents, currency)}</strong>{' '}
            more for{' '}
            {nextTier.deliveryCents === 0 ? (
              <strong>free delivery</strong>
            ) : (
              <>
                <strong className="money">{formatMoney(nextTier.deliveryCents, currency)}</strong>{' '}
                delivery
              </>
            )}
            .
          </span>
        )}
      </p>
      <div className="delivery__track" aria-hidden="true">
        <div className="delivery__fill" style={{ '--progress': progress } as CSSProperties} />
      </div>
    </div>
  );
}
