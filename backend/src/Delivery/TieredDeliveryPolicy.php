<?php

declare(strict_types=1);

namespace Acme\Delivery;

use InvalidArgumentException;
use Override;

final readonly class TieredDeliveryPolicy implements DeliveryPolicy
{
    private array $tiersByThreshold;

    public function __construct(DeliveryTier ...$tiers)
    {
        usort(
            $tiers,
            static fn (DeliveryTier $first, DeliveryTier $second): int => $first->minimumSubtotalCents <=> $second->minimumSubtotalCents,
        );

        if ($tiers === [] || $tiers[0]->minimumSubtotalCents !== 0) {
            throw new InvalidArgumentException('Delivery tiers must include a tier starting at a subtotal of 0 cents.');
        }

        $thresholds = array_map(static fn (DeliveryTier $tier): int => $tier->minimumSubtotalCents, $tiers);

        if (count($thresholds) !== count(array_unique($thresholds))) {
            throw new InvalidArgumentException('Each delivery tier must start at a different subtotal.');
        }

        $this->tiersByThreshold = $tiers;
    }

    #[Override]
    public function chargeFor(int $subtotalCents): DeliveryCharge
    {
        if ($subtotalCents < 0) {
            throw new InvalidArgumentException('A subtotal cannot be negative.');
        }

        $currentTier = $this->tiersByThreshold[0];

        foreach ($this->tiersByThreshold as $tier) {
            if ($subtotalCents < $tier->minimumSubtotalCents) {
                return new DeliveryCharge(
                    $currentTier->chargeCents,
                    new NextDeliveryTier(
                        minimumSubtotalCents: $tier->minimumSubtotalCents,
                        chargeCents: $tier->chargeCents,
                        remainingCents: $tier->minimumSubtotalCents - $subtotalCents,
                    ),
                );
            }

            $currentTier = $tier;
        }

        return new DeliveryCharge($currentTier->chargeCents);
    }
}
