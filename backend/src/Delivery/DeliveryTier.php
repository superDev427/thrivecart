<?php

declare(strict_types=1);

namespace Acme\Delivery;

use InvalidArgumentException;

final readonly class DeliveryTier
{
    public function __construct(
        public int $minimumSubtotalCents,
        public int $chargeCents,
    ) {
        if ($minimumSubtotalCents < 0 || $chargeCents < 0) {
            throw new InvalidArgumentException('Delivery tier thresholds and charges cannot be negative.');
        }
    }
}
