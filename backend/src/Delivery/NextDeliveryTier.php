<?php

declare(strict_types=1);

namespace Acme\Delivery;

final readonly class NextDeliveryTier
{
    public function __construct(
        public int $minimumSubtotalCents,
        public int $chargeCents,
        public int $remainingCents,
    ) {
    }
}
