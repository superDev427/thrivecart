<?php

declare(strict_types=1);

namespace Acme\Tests\Basket;

use Acme\AcmeWidgetCo;
use Acme\Basket\Basket;
use Acme\Basket\BasketLine;
use Acme\Catalogue\Product;
use Acme\Catalogue\UnknownProductException;
use Acme\Delivery\DeliveryCharge;
use Acme\Delivery\DeliveryPolicy;
use Acme\Offer\AppliedOffer;
use Acme\Offer\Offer;
use InvalidArgumentException;
use LogicException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class BasketTest extends TestCase
{
    public static function totalsFromTheBrief(): iterable
    {
        yield 'B01, G01' => [['B01', 'G01'], 3785];
        yield 'R01, R01' => [['R01', 'R01'], 5437];
        yield 'R01, G01' => [['R01', 'G01'], 6085];
        yield 'B01, B01, R01, R01, R01' => [['B01', 'B01', 'R01', 'R01', 'R01'], 9827];
    }

    public static function totalsUnderTheRoundingConvention(): iterable
    {
        yield 'R01' => [['R01'], 3790];
        yield 'R01, R01, R01' => [['R01', 'R01', 'R01'], 8532];
        yield 'R01, R01, R01, R01' => [['R01', 'R01', 'R01', 'R01'], 9884];
        yield 'G01, G01' => [['G01', 'G01'], 5485];
    }

    #[DataProvider('totalsFromTheBrief')]
    public function testItMatchesEveryTotalSuppliedInTheBrief(array $productCodes, int $expectedTotalCents): void
    {
        self::assertSame($expectedTotalCents, $this->basketWith(...$productCodes)->total());
    }

    #[DataProvider('totalsUnderTheRoundingConvention')]
    public function testItAppliesTheDocumentedRoundingConvention(array $productCodes, int $expectedTotalCents): void
    {
        self::assertSame($expectedTotalCents, $this->basketWith(...$productCodes)->total());
    }

    public function testAnEmptyBasketCostsNothingAndHasNoDeliveryCharge(): void
    {
        $quote = AcmeWidgetCo::newBasket()->quote();

        self::assertSame([], $quote->lines);
        self::assertSame([], $quote->appliedOffers);
        self::assertSame(0, $quote->itemCount);
        self::assertSame(0, $quote->subtotalCents);
        self::assertSame(0, $quote->delivery->chargeCents);
        self::assertNull($quote->delivery->nextTier);
        self::assertSame(0, $quote->totalCents);
    }

    public function testTwoRedWidgetsProduceTheDocumentedBreakdown(): void
    {
        $quote = $this->basketWith('R01', 'R01')->quote();

        self::assertCount(1, $quote->lines);
        self::assertSame('R01', $quote->lines[0]->product->code);
        self::assertSame(2, $quote->lines[0]->quantity);
        self::assertSame(6590, $quote->lines[0]->subtotalCents);
        self::assertSame(1648, $quote->lines[0]->discountCents);
        self::assertSame(4942, $quote->lines[0]->totalCents);

        self::assertSame(6590, $quote->subtotalCents);
        self::assertSame(1648, $quote->discountCents);
        self::assertSame(4942, $quote->discountedSubtotalCents);
        self::assertSame(495, $quote->delivery->chargeCents);
        self::assertSame(5437, $quote->totalCents);

        self::assertEquals(
            [new AppliedOffer('R01', 'Buy one Red Widget, get the second half price', 1, 1648)],
            $quote->appliedOffers,
        );
    }

    public function testDeliveryIsChargedOnTheSubtotalAfterOffers(): void
    {
        $quote = $this->basketWith('R01', 'R01')->quote();

        self::assertGreaterThanOrEqual(5000, $quote->subtotalCents);
        self::assertLessThan(5000, $quote->discountedSubtotalCents);
        self::assertSame(495, $quote->delivery->chargeCents);
    }

    public function testItRejectsUnknownProductCodesWithoutChangingTheBasket(): void
    {
        $basket = $this->basketWith('B01');

        try {
            $basket->add('X99');
            self::fail('Adding an unknown product code should be rejected.');
        } catch (UnknownProductException $exception) {
            self::assertSame('X99', $exception->productCode);
            self::assertSame('Unknown product code "X99".', $exception->getMessage());
        }

        self::assertSame(1290, $basket->total());
    }

    public function testItRejectsQuantitiesBelowOne(): void
    {
        $this->expectException(InvalidArgumentException::class);

        AcmeWidgetCo::newBasket()->add('R01', 0);
    }

    public function testRepeatedTotalCallsDoNotReapplyOffersOrChangeTheBasket(): void
    {
        $basket = $this->basketWith('R01', 'R01', 'R01', 'R01');

        $totals = [$basket->total(), $basket->total(), $basket->total()];

        self::assertSame([9884, 9884, 9884], $totals);
        self::assertSame(3296, $basket->quote()->discountCents);
        self::assertEquals($basket->quote(), $basket->quote());
    }

    public function testInsertionOrderDoesNotAffectTheQuote(): void
    {
        $grouped = $this->basketWith('B01', 'B01', 'R01', 'R01', 'R01');
        $interleaved = $this->basketWith('R01', 'B01', 'R01', 'B01', 'R01');

        self::assertEquals($grouped->quote(), $interleaved->quote());
        self::assertSame(['R01', 'B01'], array_map(static fn ($line) => $line->product->code, $interleaved->quote()->lines));
    }

    public function testAddingAQuantityMatchesAddingOneAtATime(): void
    {
        $basket = AcmeWidgetCo::newBasket();
        $basket->add('R01', 3);
        $basket->add('B01', 2);

        self::assertEquals($this->basketWith('R01', 'R01', 'R01', 'B01', 'B01')->quote(), $basket->quote());
    }

    public function testWithoutOffersEveryWidgetIsFullPrice(): void
    {
        $basket = new Basket(AcmeWidgetCo::catalogue(), AcmeWidgetCo::deliveryPolicy());
        $basket->add('R01', 2);

        self::assertSame(0, $basket->quote()->discountCents);
        self::assertSame(6590 + 295, $basket->total());
    }

    public function testItUsesAnInjectedOfferWithoutChangesToTheBasket(): void
    {
        $blueWidgetsTwentyCentsOff = new class () implements Offer {
            public function apply(BasketLine ...$lines): ?AppliedOffer
            {
                foreach ($lines as $line) {
                    if ($line->product->code === 'B01') {
                        return new AppliedOffer('B01', 'Twenty cents off every Blue Widget', $line->quantity, 20 * $line->quantity);
                    }
                }

                return null;
            }

            public function promotionFor(Product $product): ?string
            {
                return null;
            }
        };

        $basket = new Basket(AcmeWidgetCo::catalogue(), AcmeWidgetCo::deliveryPolicy(), ...[...AcmeWidgetCo::offers(), $blueWidgetsTwentyCentsOff]);
        $basket->add('R01', 2);
        $basket->add('B01', 3);
        $quote = $basket->quote();

        self::assertSame(1648 + 60, $quote->discountCents);
        self::assertSame(['R01', 'B01'], array_map(static fn (AppliedOffer $offer): string => $offer->productCode, $quote->appliedOffers));
        self::assertSame(6590 + 2385 - 1708 + 295, $quote->totalCents);
    }

    public function testItUsesAnInjectedDeliveryPolicy(): void
    {
        $flatDelivery = new class () implements DeliveryPolicy {
            public function chargeFor(int $subtotalCents): DeliveryCharge
            {
                return new DeliveryCharge(100);
            }
        };

        $basket = new Basket(AcmeWidgetCo::catalogue(), $flatDelivery, ...AcmeWidgetCo::offers());
        $basket->add('R01', 4);

        self::assertSame(13180 - 3296 + 100, $basket->total());
    }

    public function testItRejectsOffersThatDiscountMoreThanALineIsWorth(): void
    {
        $overGenerousOffer = new class () implements Offer {
            public function apply(BasketLine ...$lines): AppliedOffer
            {
                return new AppliedOffer('B01', 'Too generous', 1, 1000);
            }

            public function promotionFor(Product $product): ?string
            {
                return null;
            }
        };

        $basket = new Basket(AcmeWidgetCo::catalogue(), AcmeWidgetCo::deliveryPolicy(), $overGenerousOffer);
        $basket->add('B01');

        $this->expectException(LogicException::class);

        $basket->total();
    }

    private function basketWith(string ...$productCodes): Basket
    {
        $basket = AcmeWidgetCo::newBasket();

        foreach ($productCodes as $productCode) {
            $basket->add($productCode);
        }

        return $basket;
    }
}
