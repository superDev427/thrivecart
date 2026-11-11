<?php

declare(strict_types=1);

namespace Acme\Basket;

use Acme\Catalogue\Product;
use InvalidArgumentException;

final readonly class BasketLine
{
    public function __construct(
        public Product $product,
        public int $quantity,
    ) {
        if ($quantity < 1) {
            throw new InvalidArgumentException("A basket line for {$product->code} needs a quantity of at least 1.");
        }
    }

    public function subtotalCents(): int
    {
        return $this->product->priceCents * $this->quantity;
    }
}
