import type { Quote } from '../api/types';
import type { QuoteState } from '../basket/useBasket';
import { formatMoney } from '../format';
import { MissingValue } from './MissingValue';

type OrderSummaryProps = {
  quoteState: QuoteState;
  quote: Quote | null;
  currency: string;
  onRetry: () => void;
};

export function OrderSummary({ quoteState, quote, currency, onRetry }: OrderSummaryProps) {
  const updating = quoteState.status === 'updating';
  const money = (cents: number) => formatMoney(cents, currency);
  const hasSavings = quote !== null && quote.discountCents > 0;
  const hasFreeDelivery = quote !== null && quote.deliveryCents === 0;

  return (
    <section className="summary" aria-labelledby="summary-heading" aria-busy={updating}>
      <div className="summary__header">
        <h3 id="summary-heading">Order summary</h3>
        {updating && (
          <span className="summary__status">
            <span className="spinner" aria-hidden="true" />
            Updating totals…
          </span>
        )}
        {quoteState.status === 'failed' && (
          <span className="summary__status summary__status--failed">Totals unavailable</span>
        )}
      </div>

      {quoteState.status === 'failed' && (
        <div className="summary__error">
          <p>
            <strong>We couldn't update your totals.</strong> {quoteState.message}
          </p>
          <button type="button" className="button button--secondary" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      <dl className="summary__rows">
        <SummaryRow
          label="Products"
          value={quote && money(quote.subtotalCents)}
          pending={updating}
        />
        <SummaryRow
          label="Offer savings"
          value={quote && (hasSavings ? `−${money(quote.discountCents)}` : money(0))}
          pending={updating}
          highlighted={hasSavings}
        />
        <SummaryRow
          label="Subtotal after offers"
          value={quote && money(quote.discountedSubtotalCents)}
          pending={updating}
        />
        <SummaryRow
          label="Delivery"
          value={quote && (hasFreeDelivery ? 'Free' : money(quote.deliveryCents))}
          pending={updating}
          highlighted={hasFreeDelivery}
        />
        <div className="summary__total">
          <dt>Total</dt>
          <dd className="money">
            {quote ? money(quote.totalCents) : <MissingValue pending={updating} />}
          </dd>
        </div>
      </dl>

      <p className="summary__note">
        Delivery is based on your subtotal after offers. All prices in {currency}.
      </p>
    </section>
  );
}

type SummaryRowProps = {
  label: string;
  value: string | null;
  pending: boolean;
  highlighted?: boolean;
};

function SummaryRow({ label, value, pending, highlighted = false }: SummaryRowProps) {
  return (
    <div className="summary__row" data-highlighted={highlighted}>
      <dt>{label}</dt>
      <dd className="money">{value ?? <MissingValue pending={pending} />}</dd>
    </div>
  );
}
