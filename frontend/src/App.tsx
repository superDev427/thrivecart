import { useBasket } from './basket/useBasket';
import { useCatalogue } from './catalogue/useCatalogue';
import { BasketPanel } from './components/BasketPanel';
import { ProductCatalogue } from './components/ProductCatalogue';
import { SiteHeader } from './components/SiteHeader';

export function App() {
  const { state: catalogueState, retry: retryCatalogue } = useCatalogue();
  const basket = useBasket(catalogueState.status === 'ready' ? catalogueState.catalogue : null);

  return (
    <>
      <SiteHeader itemCount={basket.itemCount} />
      <main className="page">
        <section className="intro" aria-labelledby="intro-heading">
          <h1 id="intro-heading">Well-made widgets, plainly priced.</h1>
          <p>
            Three precision widgets from our workshop. Add what you need and your offers, delivery
            and total update as you go.
          </p>
        </section>
        <div className="shop-layout">
          <ProductCatalogue
            state={catalogueState}
            items={basket.items}
            maximumQuantity={basket.maximumQuantity}
            onAdd={basket.add}
            onRetry={retryCatalogue}
          />
          <BasketPanel catalogueState={catalogueState} basket={basket} />
        </div>
      </main>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {basket.announcement}
      </div>
    </>
  );
}
