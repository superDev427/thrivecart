import { formatItemCount } from '../format';
import { BasketIcon } from './icons';

export function SiteHeader({ itemCount }: { itemCount: number }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <p className="wordmark">
          <svg className="wordmark__mark" viewBox="0 0 44 14" aria-hidden="true" focusable="false">
            <circle cx="7" cy="7" r="6" fill="#d9472f" />
            <path d="M22 1.5 28 12.5H16Z" fill="#2f8a5b" />
            <rect x="32" y="1" width="12" height="12" rx="2" fill="#2f67c9" />
          </svg>
          <span>Acme Widget Co</span>
        </p>
        <a
          className="basket-link"
          href="#basket"
          aria-label={`Basket, ${formatItemCount(itemCount)}`}
        >
          <BasketIcon />
          <span className="basket-link__label">Basket</span>
          <span className="basket-link__count" data-empty={itemCount === 0}>
            {itemCount}
          </span>
        </a>
      </div>
    </header>
  );
}
