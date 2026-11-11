<?php

declare(strict_types=1);

namespace Acme\Basket;

use Acme\Delivery\DeliveryCharge;

final readonly class Quote
{
    public int $itemCount;
    public int $discountedSubtotalCents;
    public int $totalCents;

    public function __construct(
        public array $lines,
        public array $appliedOffers,
        public int $subtotalCents,
        public int $discountCents,
        public DeliveryCharge $delivery,
    ) {
        $this->itemCount = array_sum(array_map(static fn (QuoteLine $line): int => $line->quantity, $lines));
        $this->discountedSubtotalCents = $subtotalCents - $discountCents;
        $this->totalCents = $this->discountedSubtotalCents + $delivery->chargeCents;
    }
}
