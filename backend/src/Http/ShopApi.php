<?php

declare(strict_types=1);

namespace Acme\Http;

use Acme\Basket\Basket;
use Acme\Basket\Quote;
use Acme\Basket\QuoteLine;
use Acme\Catalogue\Product;
use Acme\Catalogue\ProductCatalogue;
use Acme\Catalogue\UnknownProductException;
use Acme\Delivery\DeliveryPolicy;
use Acme\Offer\AppliedOffer;
use Acme\Offer\Offer;
use Throwable;

final readonly class ShopApi
{
    private array $offers;

    public function __construct(
        private ProductCatalogue $catalogue,
        private DeliveryPolicy $deliveryPolicy,
        private QuoteRequestParser $quoteRequestParser,
        private string $currency,
        Offer ...$offers,
    ) {
        $this->offers = $offers;
    }

    public function handle(Request $request): JsonResponse
    {
        try {
            return $this->route($request);
        } catch (ApiError $error) {
            return JsonResponse::error($error->status, $error->errorCode, $error->getMessage());
        } catch (UnknownProductException $exception) {
            return JsonResponse::error(422, 'unknown_product', $exception->getMessage());
        } catch (Throwable $exception) {
            error_log(sprintf('%s: %s in %s:%d', $exception::class, $exception->getMessage(), $exception->getFile(), $exception->getLine()));

            return JsonResponse::error(500, 'server_error', 'Something went wrong on our side. Please try again.');
        }
    }

    private function route(Request $request): JsonResponse
    {
        [$allowedMethod, $endpoint] = match ($request->path) {
            '/api/products' => ['GET', fn (): JsonResponse => $this->products()],
            '/api/basket/quote' => ['POST', fn (): JsonResponse => $this->quote($request->body)],
            default => throw new ApiError(404, 'not_found', 'No API endpoint exists at this path.'),
        };

        if ($request->method !== $allowedMethod) {
            return JsonResponse::error(405, 'method_not_allowed', "Use {$allowedMethod} for this endpoint.", ['Allow' => $allowedMethod]);
        }

        return $endpoint();
    }

    private function products(): JsonResponse
    {
        return new JsonResponse(200, [
            'currency' => $this->currency,
            'maximumQuantityPerProduct' => $this->quoteRequestParser->maximumQuantityPerProduct,
            'products' => array_map(
                fn (Product $product): array => [
                    'code' => $product->code,
                    'name' => $product->name,
                    'unitPriceCents' => $product->priceCents,
                    'promotions' => $this->promotionsFor($product),
                ],
                $this->catalogue->products(),
            ),
        ]);
    }

    private function quote(string $body): JsonResponse
    {
        $basket = new Basket($this->catalogue, $this->deliveryPolicy, ...$this->offers);

        foreach ($this->quoteRequestParser->parse($body) as $code => $quantity) {
            $basket->add((string) $code, $quantity);
        }

        return new JsonResponse(200, $this->presentQuote($basket->quote()));
    }

    private function promotionsFor(Product $product): array
    {
        $promotions = array_map(static fn (Offer $offer): ?string => $offer->promotionFor($product), $this->offers);

        return array_values(array_filter($promotions, static fn (?string $promotion): bool => $promotion !== null));
    }

    private function presentQuote(Quote $quote): array
    {
        $nextTier = $quote->delivery->nextTier;

        return [
            'currency' => $this->currency,
            'itemCount' => $quote->itemCount,
            'lines' => array_map(
                static fn (QuoteLine $line): array => [
                    'code' => $line->product->code,
                    'name' => $line->product->name,
                    'quantity' => $line->quantity,
                    'unitPriceCents' => $line->product->priceCents,
                    'subtotalCents' => $line->subtotalCents,
                    'discountCents' => $line->discountCents,
                    'totalCents' => $line->totalCents,
                ],
                $quote->lines,
            ),
            'appliedOffers' => array_map(
                static fn (AppliedOffer $offer): array => [
                    'productCode' => $offer->productCode,
                    'description' => $offer->description,
                    'timesApplied' => $offer->timesApplied,
                    'discountCents' => $offer->discountCents,
                ],
                $quote->appliedOffers,
            ),
            'subtotalCents' => $quote->subtotalCents,
            'discountCents' => $quote->discountCents,
            'discountedSubtotalCents' => $quote->discountedSubtotalCents,
            'deliveryCents' => $quote->delivery->chargeCents,
            'nextDeliveryTier' => $nextTier === null ? null : [
                'thresholdCents' => $nextTier->minimumSubtotalCents,
                'deliveryCents' => $nextTier->chargeCents,
                'remainingCents' => $nextTier->remainingCents,
            ],
            'totalCents' => $quote->totalCents,
        ];
    }
}
