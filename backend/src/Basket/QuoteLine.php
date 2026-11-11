<?php

declare(strict_types=1);

namespace Acme\Basket;

use Acme\Catalogue\Product;
use LogicException;

final readonly class QuoteLine
{
    public Product $product;
    public int $quantity;
    public int $subtotalCents;
    public int $totalCents;

    public function __construct(BasketLine $line, public int $discountCents)
    {
        if ($discountCents < 0 || $discountCents > $line->subtotalCents()) {
            throw new LogicException("Offers cannot discount {$line->product->code} by {$discountCents} cents.");
        }

        $this->product = $line->product;
        $this->quantity = $line->quantity;
        $this->subtotalCents = $line->subtotalCents();
        $this->totalCents = $this->subtotalCents - $discountCents;
    }
}
