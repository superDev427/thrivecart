<?php

declare(strict_types=1);

namespace Acme\Delivery;

interface DeliveryPolicy
{
    public function chargeFor(int $subtotalCents): DeliveryCharge;
}
