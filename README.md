# Acme Widget Co basket

A small storefront for Acme Widget Co's three widgets. A framework-free PHP API owns the catalogue, offers, delivery rules and every total. A React and TypeScript storefront lets shoppers build a basket and shows the backend's priced quote as they go.

- `backend/` contains PHP 8.3 domain logic and a JSON API served by PHP's built-in web server.
- `frontend/` contains a Vite, React 19 and TypeScript single-page storefront. In development, Vite proxies `/api` to the PHP server.

## Prerequisites

| Tool | Required | Used during development |
|---|---|---|
| PHP | 8.3 or newer | 8.3.32 |
| Composer | 2.x | 2.11.2 |
| Node.js | 22.12 or newer (24 LTS recommended) | 22.18.0 |
| npm | 10 or newer | 10.9.3 |

At runtime the API needs only PHP's core `json` extension. PHPUnit also needs `dom`, `mbstring`, `xml`, `xmlwriter` and `tokenizer`. Composer needs `openssl` plus `zip` or an `unzip` binary. Most PHP distributions enable these by default. Bare Windows builds may need them switched on in `php.ini`.

## Install

```bash
cd backend
composer install

cd ../frontend
npm ci
```

## Run

Run the API and the storefront in two terminals.

```bash
cd backend
composer serve
```

This starts the API at `http://127.0.0.1:8000`. It is equivalent to `php -S 127.0.0.1:8000 -t public public/index.php`.

```bash
cd frontend
npm run dev
```

This starts the storefront at `http://127.0.0.1:5173`. Requests to `/api/*` are proxied to `http://127.0.0.1:8000`, so no CORS configuration is needed.

To try the production bundle, run `npm run build` and then `npm run preview`. The preview is served at `http://127.0.0.1:4173` with the same API proxy, and the PHP server must still be running.

## Tests and checks

| Where | Command | What it does |
|---|---|---|
| `backend/` | `composer test` | PHPUnit: domain, rounding, delivery boundaries and API boundary tests |
| `backend/` | `composer analyse` | PHPStan at level 8 over `src`, `tests` and `public` |
| `frontend/` | `npm test` | Vitest and Testing Library: basket journey, failures, stale responses, storage |
| `frontend/` | `npm run typecheck` | `tsc --noEmit` in strict mode |
| `frontend/` | `npm run lint` | ESLint with typescript-eslint and the React Hooks rules |
| `frontend/` | `npm run format:check` | Prettier |
| `frontend/` | `npm run build` | Type check, then the Vite production build into `frontend/dist` |

The source has no code comments or docblocks; intent is carried by native types and names, and explanations live in this README. Because there are no docblocks, nothing describes the contents of arrays, so PHPStan's `missingType.iterableValue` check is turned off in `phpstan.dist.neon`. Every other level-8 check applies.

## Architecture

```
backend/
  public/index.php            entry point: error handling, dispatch to the API
  src/AcmeWidgetCo.php        composition root: catalogue, delivery tiers, offers, API wiring
  src/Catalogue/              Product, ProductCatalogue, UnknownProductException
  src/Basket/                 Basket, BasketLine, Quote, QuoteLine
  src/Offer/                  Offer (strategy), BuyOneGetSecondHalfPriceOffer, AppliedOffer
  src/Delivery/               DeliveryPolicy (strategy), TieredDeliveryPolicy, DeliveryTier,
                              DeliveryCharge, NextDeliveryTier
  src/Http/                   Request, JsonResponse, ApiError, QuoteRequestParser, ShopApi
  tests/                      PHPUnit tests mirroring src/
frontend/src/
  api/                        typed fetch client and response types
  catalogue/useCatalogue.ts   catalogue loading and retry
  basket/useBasket.ts         selection state, quote requests, stale-response protection
  basket/storage.ts           validated localStorage persistence of codes and quantities
  components/                 header, product cards, basket panel, summary, illustrations
```

### Backend

`Basket` receives its `ProductCatalogue`, `DeliveryPolicy` and any number of `Offer` strategies through its constructor. It never builds its own collaborators.

- `add(string $productCode, int $quantity = 1)` validates the code against the catalogue and increments a quantity. Unknown codes throw `UnknownProductException` and leave the basket unchanged.
- `quote()` builds the full breakdown. Lines are ordered by the catalogue, so insertion order cannot affect the result.
- `total()` returns `quote()->totalCents`. The quote and the total therefore share one calculation path, and calling either method never mutates the basket.

```php
$basket = new Basket($catalogue, $deliveryPolicy, new BuyOneGetSecondHalfPriceOffer('R01'));
$basket->add('R01');
$basket->add('R01');
$basket->total();
```

The final call returns `5437`.

Offers and delivery are plain strategy interfaces:

- An `Offer` inspects the basket lines and returns an `AppliedOffer`, or `null`. The applied offer records the product code, a description, how many times it applied and the discount in cents. An offer can also advertise a short promotion label for a product, which the products endpoint exposes.
- A `DeliveryPolicy` turns a subtotal into a `DeliveryCharge`. `TieredDeliveryPolicy` also reports the next cheaper tier and how far away it is, which drives the delivery guidance in the UI.

`AcmeWidgetCo` is the composition root, and `public/index.php` calls it. The API tests use the same root, so they exercise the real configuration. No container or framework is involved.

The HTTP layer is deliberately small. `ShopApi` routes two endpoints. It maps validation failures to stable error codes and logs unexpected exceptions with `error_log` while returning a generic 500 message. `QuoteRequestParser` owns request validation.

### Frontend

- `useCatalogue` loads `GET /api/products` and exposes loading, ready and failed states with a retry.
- `useBasket` holds the selected codes and quantities and requests a quote whenever they change.
  - Each request is keyed to the exact selection it was made for, and the previous request is aborted with `AbortController`.
  - A response is shown only if its key still matches the current basket.
  - While a new quote is pending, the previous figures are dimmed and labelled "Updating totals…". If recalculation fails, the selection stays, the totals show as unavailable, and a "Try again" button repeats the request.
- Only product codes and quantities are stored in `localStorage`. Restored data is validated, merged, filtered against the live catalogue and re-quoted. Prices and totals are never cached.
- React performs no pricing. Every figure, offer description and the delivery guidance comes from the quote response. The client only formats cents as dollars.

Accessibility details:

- Everything is built from semantic landmarks and real buttons. Labels name the product, such as "Increase Red Widget quantity" and "Remove Red Widget from basket".
- The decrease control uses `aria-disabled` at quantity one, so keyboard focus is not lost, and a separate Remove button sits beside it.
- A single polite live region announces basket changes. Focus is visible on every control, and reduced-motion preferences are respected.
- The basket panel becomes sticky on wide screens only when it fits inside the viewport, which a `ResizeObserver` measures.

## API

### `GET /api/products`

```json
{
  "currency": "USD",
  "maximumQuantityPerProduct": 99,
  "products": [
    { "code": "R01", "name": "Red Widget", "unitPriceCents": 3295, "promotions": ["Second one half price"] },
    { "code": "G01", "name": "Green Widget", "unitPriceCents": 2495, "promotions": [] },
    { "code": "B01", "name": "Blue Widget", "unitPriceCents": 795, "promotions": [] }
  ]
}
```

### `POST /api/basket/quote`

Request:

```json
{ "items": [{ "code": "R01", "quantity": 2 }, { "code": "B01", "quantity": 1 }] }
```

Response (`200`):

```json
{
  "currency": "USD",
  "itemCount": 3,
  "lines": [
    { "code": "R01", "name": "Red Widget", "quantity": 2, "unitPriceCents": 3295, "subtotalCents": 6590, "discountCents": 1648, "totalCents": 4942 },
    { "code": "B01", "name": "Blue Widget", "quantity": 1, "unitPriceCents": 795, "subtotalCents": 795, "discountCents": 0, "totalCents": 795 }
  ],
  "appliedOffers": [
    { "productCode": "R01", "description": "Buy one Red Widget, get the second half price", "timesApplied": 1, "discountCents": 1648 }
  ],
  "subtotalCents": 7385,
  "discountCents": 1648,
  "discountedSubtotalCents": 5737,
  "deliveryCents": 295,
  "nextDeliveryTier": { "thresholdCents": 9000, "deliveryCents": 0, "remainingCents": 3263 },
  "totalCents": 6032
}
```

`nextDeliveryTier` is `null` once the cheapest delivery tier has been reached, and for an empty basket.

### Validation and errors

- `items` must be an array; an empty array is valid and quotes `$0.00` with no delivery.
- Each item needs a non-empty string `code` and an integer `quantity` from 1 to 99. Strings such as `"2"`, decimals such as `2.0` and nulls are rejected.
- Duplicate codes are combined into one line, and the 99 limit applies to the combined quantity.
- Codes are case-sensitive and must exist in the catalogue.
- Any other fields, including client-supplied prices or totals, are ignored. The server prices everything.

Errors use one shape, for example `{"error":{"code":"invalid_request","message":"items[0].quantity must be a whole number from 1 to 99."}}`. Messages never include stack traces, file paths or exception details.

| Status | `error.code` | When |
|---|---|---|
| 400 | `malformed_json` | Body is empty or not valid JSON |
| 404 | `not_found` | Unknown path |
| 405 | `method_not_allowed` | Wrong method, with an `Allow` header |
| 422 | `invalid_request` | Wrong shape, invalid code type, invalid quantity or over the limit |
| 422 | `unknown_product` | Code is not in the catalogue |
| 500 | `server_error` | Unexpected failure, logged on the server only |

## Pricing rules and assumptions

| Product | Code | Price |
|---|---|---:|
| Red Widget | R01 | $32.95 |
| Green Widget | G01 | $24.95 |
| Blue Widget | B01 | $7.95 |

| Subtotal after offers | Delivery |
|---|---:|
| under $50.00 | $4.95 |
| $50.00 to $89.99 | $2.95 |
| $90.00 and over | free |

- **Money is integer cents throughout.** The domain never uses floating point. Only the frontend converts cents to dollars, for display.
- **Delivery is charged on the subtotal after offers.** That is the amount the customer actually pays for goods, and the brief's own example requires it. For `R01, R01` the offer brings $65.90 down to $49.42, which is under $50, so delivery is $4.95 and the total is $54.37. Charging delivery on the pre-offer subtotal would give $2.95 delivery and $52.37.
- **An empty basket costs $0.00** and has no delivery charge.
- **Red Widget offer: "buy one, get the second half price."** It applies to every complete pair: the number of pairs is the red quantity divided by two, rounded down, and any unmatched red widget stays full price.
- **Half-cent rounding is per pair.** Half of 3,295 cents is 1,647.5. The half-price widget is charged 1,647 cents, rounded down in the customer's favour, so each pair is discounted by 1,648 cents. The rule is applied to each pair independently, never to the aggregate. Four red widgets therefore save 2 × 1,648 = 3,296 cents and total $98.84. Halving the combined discount instead would save 3,295 cents and give $98.85. The brief's examples fix the single-pair result but not the multi-pair rounding, so this is a documented choice. In code the half-price item costs `intdiv(price, 2)`.
- **Offers are evaluated independently** against the undiscounted basket lines, and their discounts are summed per line. The basket rejects an offer that would discount a line below zero, or a product that is not in the basket.
- **Quantity limit:** 99 per product per quote. This is an API rule, published to the frontend through `maximumQuantityPerProduct`.

### Totals supplied in the brief

These are acceptance criteria. They are asserted in both `BasketTest` and `ShopApiTest`.

| Basket | Total |
|---|---:|
| B01, G01 | $37.85 |
| R01, R01 | $54.37 |
| R01, G01 | $60.85 |
| B01, B01, R01, R01, R01 | $98.27 |

### Totals that follow from the assumptions above

These were not supplied by the brief. They depend on the per-pair rounding convention and are asserted in `BasketTest`.

| Basket | Total |
|---|---:|
| R01 | $37.90 |
| R01, R01, R01 | $85.32 |
| R01, R01, R01, R01 | $98.84 |
| G01, G01 | $54.85 |

`TieredDeliveryPolicyTest` checks the delivery boundaries with synthetic subtotals:

| Subtotal | Delivery |
|---|---:|
| $49.99 | $4.95 |
| $50.00 | $2.95 |
| $89.99 | $2.95 |
| $90.00 | $0.00 |

## Adding another offer

Implement `Acme\Offer\Offer` and register the new class in `AcmeWidgetCo::offers()`. `Basket` needs no changes. Its discount appears in the quote, the line totals and the applied-offer list, and its promotion label appears on the product card.

```php
final readonly class TenPercentOffTenBlueWidgetsOffer implements Offer
{
    #[Override]
    public function apply(BasketLine ...$lines): ?AppliedOffer
    {
        foreach ($lines as $line) {
            if ($line->product->code === 'B01' && $line->quantity >= 10) {
                return new AppliedOffer('B01', 'Ten or more Blue Widgets: 10% off', 1, intdiv($line->subtotalCents(), 10));
            }
        }

        return null;
    }

    #[Override]
    public function promotionFor(Product $product): ?string
    {
        return $product->code === 'B01' ? '10% off ten or more' : null;
    }
}
```

A different delivery model works the same way: implement `DeliveryPolicy` and return it from `AcmeWidgetCo::deliveryPolicy()`. `BasketTest` shows both substitutions with anonymous strategy classes.

## Limitations

- PHP's built-in server is for development only. It is single-threaded and labels 422 responses "Unknown Status Code" in the status line; the status code itself is correct. In production, `public/index.php` would sit behind PHP-FPM, and the built `frontend/dist` would be served statically with `/api` routed to PHP.
- The catalogue, prices and offers are configured in code (`AcmeWidgetCo`) rather than stored. The brief rules out a database.
- An offer returns at most one `AppliedOffer`, aimed at one product line. Basket-wide discounts, such as a percentage off the whole order, would need a small extension to `Offer` and `Quote`.
- If the catalogue changes so that a saved code becomes unknown, the storefront drops that item when it restores the basket. If the server rejects a code during a session, the shopper sees the error and can remove the item.
- The interface was checked in headless Microsoft Edge (Chromium) at 360, 768 and 1440 px. It has not been tested in Firefox or Safari, or with a physical screen reader.
- Checkout, payment, accounts, search and inventory are out of scope by design.
