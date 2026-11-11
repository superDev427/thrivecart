<?php

declare(strict_types=1);

namespace Acme\Offer;

use Acme\Basket\BasketLine;
use Acme\Catalogue\Product;
use Override;

final readonly class BuyOneGetSecondHalfPriceOffer implements Offer
{
    public function __construct(private string $productCode)
    {
    }

    #[Override]
    public function apply(BasketLine ...$lines): ?AppliedOffer
    {
        foreach ($lines as $line) {
            if ($line->product->code === $this->productCode) {
                return $this->applyToLine($line);
            }
        }

        return null;
    }

    #[Override]
    public function promotionFor(Product $product): ?string
    {
        return $product->code === $this->productCode ? 'Second one half price' : null;
    }

    private function applyToLine(BasketLine $line): ?AppliedOffer
    {
        $qualifyingPairs = intdiv($line->quantity, 2);
        $halfPriceCents = intdiv($line->product->priceCents, 2);
        $discountPerPairCents = $line->product->priceCents - $halfPriceCents;

        if ($qualifyingPairs === 0 || $discountPerPairCents === 0) {
            return null;
        }

        return new AppliedOffer(
            productCode: $line->product->code,
            description: "Buy one {$line->product->name}, get the second half price",
            timesApplied: $qualifyingPairs,
            discountCents: $qualifyingPairs * $discountPerPairCents,
        );
    }
}
