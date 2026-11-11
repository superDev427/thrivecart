<?php

declare(strict_types=1);

namespace Acme\Offer;

use InvalidArgumentException;

final readonly class AppliedOffer
{
    public function __construct(
        public string $productCode,
        public string $description,
        public int $timesApplied,
        public int $discountCents,
    ) {
        if ($timesApplied < 1) {
            throw new InvalidArgumentException('An applied offer must have been applied at least once.');
        }

        if ($discountCents < 1) {
            throw new InvalidArgumentException('An applied offer must discount at least one cent.');
        }
    }
}
