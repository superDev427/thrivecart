import type { Product } from '../api/types';
import { formatMoney } from '../format';
import { WidgetIllustration } from './WidgetIllustration';
import { widgetTintStyle } from './widgetDesigns';

type ProductCardProps = {
  product: Product;
  currency: string;
  quantityInBasket: number;
  maximumQuantity: number;
  onAdd: () => void;
};

export function ProductCard({
  product,
  currency,
  quantityInBasket,
  maximumQuantity,
  onAdd,
}: ProductCardProps) {
  const headingId = `product-${product.code}`;
  const atLimit = quantityInBasket >= maximumQuantity;
  const [promotion] = product.promotions;

  return (
    <article
      className="product-card"
      style={widgetTintStyle(product.code)}
      aria-labelledby={headingId}
    >
      <div className="product-card__media">
        <WidgetIllustration code={product.code} />
      </div>
      {promotion !== undefined && <p className="offer-badge product-card__badge">{promotion}</p>}
      <div className="product-card__title">
        <h3 id={headingId}>{product.name}</h3>
        <p className="product-code">
          <span className="visually-hidden">Product code </span>
          {product.code}
        </p>
      </div>
      <div className="product-card__purchase">
        <div className="product-card__pricing">
          <p className="product-card__price">{formatMoney(product.unitPriceCents, currency)}</p>
          <p className="product-card__in-basket">
            {quantityInBasket > 0 &&
              (atLimit
                ? `${quantityInBasket} in basket · limit reached`
                : `${quantityInBasket} in basket`)}
          </p>
        </div>
        <button
          type="button"
          className="button button--primary product-card__add"
          aria-label={`Add to basket: ${product.name}`}
          aria-disabled={atLimit}
          onClick={() => {
            if (!atLimit) {
              onAdd();
            }
          }}
        >
          Add to basket
        </button>
      </div>
    </article>
  );
}
