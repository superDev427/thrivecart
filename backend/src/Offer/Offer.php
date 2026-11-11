<?php

declare(strict_types=1);

namespace Acme\Offer;

use Acme\Basket\BasketLine;
use Acme\Catalogue\Product;

interface Offer
{
    public function apply(BasketLine ...$lines): ?AppliedOffer;

    public function promotionFor(Product $product): ?string;
}
