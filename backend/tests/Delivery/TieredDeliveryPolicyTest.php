<?php

declare(strict_types=1);

namespace Acme\Tests\Delivery;

use Acme\Delivery\DeliveryTier;
use Acme\Delivery\NextDeliveryTier;
use Acme\Delivery\TieredDeliveryPolicy;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class TieredDeliveryPolicyTest extends TestCase
{
    private TieredDeliveryPolicy $policy;

    protected function setUp(): void
    {
        $this->policy = new TieredDeliveryPolicy(
            new DeliveryTier(minimumSubtotalCents: 9000, chargeCents: 0),
            new DeliveryTier(minimumSubtotalCents: 0, chargeCents: 495),
            new DeliveryTier(minimumSubtotalCents: 5000, chargeCents: 295),
        );
    }

    public static function boundaries(): iterable
    {
        yield 'nothing spent' => [0, 495];
        yield '$49.99' => [4999, 495];
        yield '$50.00' => [5000, 295];
        yield '$89.99' => [8999, 295];
        yield '$90.00' => [9000, 0];
        yield '$1,000.00' => [100000, 0];
    }

    #[DataProvider('boundaries')]
    public function testItChargesTheTierTheSubtotalFallsInto(int $subtotalCents, int $expectedChargeCents): void
    {
        self::assertSame($expectedChargeCents, $this->policy->chargeFor($subtotalCents)->chargeCents);
    }

    public function testItDescribesTheNextCheaperTier(): void
    {
        self::assertEquals(new NextDeliveryTier(5000, 295, 58), $this->policy->chargeFor(4942)->nextTier);
        self::assertEquals(new NextDeliveryTier(9000, 0, 4000), $this->policy->chargeFor(5000)->nextTier);
        self::assertEquals(new NextDeliveryTier(9000, 0, 1), $this->policy->chargeFor(8999)->nextTier);
        self::assertNull($this->policy->chargeFor(9000)->nextTier);
    }

    public function testItRequiresATierStartingAtZero(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new TieredDeliveryPolicy(new DeliveryTier(5000, 295));
    }

    public function testItRejectsTiersWithTheSameThreshold(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new TieredDeliveryPolicy(new DeliveryTier(0, 495), new DeliveryTier(0, 295));
    }

    public function testItRejectsNegativeSubtotals(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->policy->chargeFor(-1);
    }
}
