<?php

declare(strict_types=1);

namespace Acme\Basket;

use Acme\Catalogue\ProductCatalogue;
use Acme\Delivery\DeliveryCharge;
use Acme\Delivery\DeliveryPolicy;
use Acme\Offer\Offer;
use InvalidArgumentException;
use LogicException;

final class Basket
{
    private array $quantitiesByCode = [];
    private readonly array $offers;

    public function __construct(
        private readonly ProductCatalogue $catalogue,
        private readonly DeliveryPolicy $deliveryPolicy,
        Offer ...$offers,
    ) {
        $this->offers = $offers;
    }

    public function add(string $productCode, int $quantity = 1): void
    {
        if ($quantity < 1) {
            throw new InvalidArgumentException('Quantity must be at least 1.');
        }

        $product = $this->catalogue->find($productCode);
        $this->quantitiesByCode[$product->code] = ($this->quantitiesByCode[$product->code] ?? 0) + $quantity;
    }

    public function total(): int
    {
        return $this->quote()->totalCents;
    }

    public function quote(): Quote
    {
        $lines = $this->lines();
        $appliedOffers = $this->applyOffers($lines);
        $quoteLines = $this->discountLines($lines, $appliedOffers);

        $subtotalCents = array_sum(array_map(static fn (QuoteLine $line): int => $line->subtotalCents, $quoteLines));
        $discountCents = array_sum(array_map(static fn (QuoteLine $line): int => $line->discountCents, $quoteLines));

        $delivery = $quoteLines === []
            ? new DeliveryCharge(0)
            : $this->deliveryPolicy->chargeFor($subtotalCents - $discountCents);

        return new Quote($quoteLines, $appliedOffers, $subtotalCents, $discountCents, $delivery);
    }

    private function lines(): array
    {
        $lines = [];

        foreach ($this->catalogue->products() as $product) {
            $quantity = $this->quantitiesByCode[$product->code] ?? 0;

            if ($quantity > 0) {
                $lines[] = new BasketLine($product, $quantity);
            }
        }

        return $lines;
    }

    private function applyOffers(array $lines): array
    {
        $appliedOffers = [];

        foreach ($this->offers as $offer) {
            $appliedOffer = $offer->apply(...$lines);

            if ($appliedOffer !== null) {
                $appliedOffers[] = $appliedOffer;
            }
        }

        return $appliedOffers;
    }

    private function discountLines(array $lines, array $appliedOffers): array
    {
        $discountsByCode = [];

        foreach ($appliedOffers as $appliedOffer) {
            $discountsByCode[$appliedOffer->productCode] = ($discountsByCode[$appliedOffer->productCode] ?? 0) + $appliedOffer->discountCents;
        }

        $discountsOutsideBasket = array_diff_key($discountsByCode, $this->quantitiesByCode);

        if ($discountsOutsideBasket !== []) {
            throw new LogicException('An offer discounted a product that is not in the basket: ' . implode(', ', array_keys($discountsOutsideBasket)) . '.');
        }

        return array_map(
            static fn (BasketLine $line): QuoteLine => new QuoteLine($line, $discountsByCode[$line->product->code] ?? 0),
            $lines,
        );
    }
}
