import type { Product, QuoteLine } from '../api/types';
import { formatMoney } from '../format';
import { MissingValue } from './MissingValue';
import { QuantityStepper } from './QuantityStepper';
import { WidgetIllustration } from './WidgetIllustration';
import { widgetTintStyle } from './widgetDesigns';

type BasketLineItemProps = {
  product: Product;
  quantity: number;
  line: QuoteLine | null;
  pending: boolean;
  currency: string;
  maximumQuantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
};

export function BasketLineItem({
  product,
  quantity,
  line,
  pending,
  currency,
  maximumQuantity,
  onIncrease,
  onDecrease,
  onRemove,
}: BasketLineItemProps) {
  return (
    <li className="basket-line">
      <div className="basket-line__thumb" style={widgetTintStyle(product.code)}>
        <WidgetIllustration code={product.code} />
      </div>
      <div className="basket-line__details">
        <h3 className="basket-line__name">{product.name}</h3>
        <p className="basket-line__meta">
          <span className="visually-hidden">Product code </span>
          {product.code} · {formatMoney(product.unitPriceCents, currency)} each
        </p>
      </div>
      <p className="basket-line__price">
        {line === null ? (
          <MissingValue pending={pending} />
        ) : (
          <>
            {line.discountCents > 0 && (
              <s className="basket-line__original money">
                <span className="visually-hidden">Was </span>
                {formatMoney(line.subtotalCents, currency)}
              </s>
            )}
            <span className="basket-line__total money">
              {line.discountCents > 0 && <span className="visually-hidden">Now </span>}
              {formatMoney(line.totalCents, currency)}
            </span>
          </>
        )}
      </p>
      <div className="basket-line__controls">
        <QuantityStepper
          productName={product.name}
          quantity={quantity}
          maximum={maximumQuantity}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
        />
        <button
          type="button"
          className="button button--quiet"
          aria-label={`Remove ${product.name} from basket`}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </li>
  );
}
