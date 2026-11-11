<?php

declare(strict_types=1);

namespace Acme\Catalogue;

use InvalidArgumentException;

final readonly class Product
{
    public function __construct(
        public string $code,
        public string $name,
        public int $priceCents,
    ) {
        if (trim($code) === '') {
            throw new InvalidArgumentException('A product code cannot be empty.');
        }

        if ($priceCents < 0) {
            throw new InvalidArgumentException("The price of {$code} cannot be negative.");
        }
    }
}
