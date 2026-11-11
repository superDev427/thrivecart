import type { BasketItem } from '../api/types';
import type { CatalogueState } from '../catalogue/useCatalogue';
import { ErrorNotice } from './ErrorNotice';
import { ProductCard } from './ProductCard';

type ProductCatalogueProps = {
  state: CatalogueState;
  items: BasketItem[];
  maximumQuantity: number;
  onAdd: (code: string) => void;
  onRetry: () => void;
};

export function ProductCatalogue({
  state,
  items,
  maximumQuantity,
  onAdd,
  onRetry,
}: ProductCatalogueProps) {
  return (
    <section
      className="catalogue"
      aria-labelledby="catalogue-heading"
      aria-busy={state.status === 'loading'}
    >
      <div className="catalogue__header">
        <h2 id="catalogue-heading">The collection</h2>
        {state.status === 'ready' && (
          <p className="catalogue__meta">Prices in {state.catalogue.currency}</p>
        )}
      </div>

      {state.status === 'loading' && (
        <>
          <p className="visually-hidden">Loading widgets…</p>
          <ul className="product-grid" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <li key={index}>
                <div className="product-card product-card--skeleton">
                  <div className="product-card__media skeleton" />
                  <div className="product-card__title">
                    <span className="skeleton skeleton--line" />
                    <span className="skeleton skeleton--line skeleton--short" />
                  </div>
                  <div className="product-card__purchase">
                    <span className="skeleton skeleton--button" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {state.status === 'failed' && (
        <ErrorNotice
          title="We couldn't load our widgets."
          message={state.message}
          actionLabel="Try again"
          onAction={onRetry}
        />
      )}

      {state.status === 'ready' && (
        <ul className="product-grid">
          {state.catalogue.products.map((product) => (
            <li key={product.code}>
              <ProductCard
                product={product}
                currency={state.catalogue.currency}
                quantityInBasket={items.find((item) => item.code === product.code)?.quantity ?? 0}
                maximumQuantity={maximumQuantity}
                onAdd={() => onAdd(product.code)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
