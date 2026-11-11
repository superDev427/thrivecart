<?php

declare(strict_types=1);

namespace Acme\Delivery;

use InvalidArgumentException;

final readonly class DeliveryCharge
{
    public function __construct(
        public int $chargeCents,
        public ?NextDeliveryTier $nextTier = null,
    ) {
        if ($chargeCents < 0) {
            throw new InvalidArgumentException('A delivery charge cannot be negative.');
        }
    }
}
