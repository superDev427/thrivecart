<?php

declare(strict_types=1);

namespace Acme\Tests\Offer;

use Acme\Basket\BasketLine;
use Acme\Catalogue\Product;
use Acme\Offer\BuyOneGetSecondHalfPriceOffer;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class BuyOneGetSecondHalfPriceOfferTest extends TestCase
{
    private Product $redWidget;
    private BuyOneGetSecondHalfPriceOffer $offer;

    protected function setUp(): void
    {
        $this->redWidget = new Product('R01', 'Red Widget', 3295);
        $this->offer = new BuyOneGetSecondHalfPriceOffer('R01');
    }

    public static function qualifyingQuantities(): iterable
    {
        yield 'one pair' => [2, 1, 1648];
        yield 'one pair and an unmatched widget' => [3, 1, 1648];
        yield 'two pairs' => [4, 2, 3296];
        yield 'two pairs and an unmatched widget' => [5, 2, 3296];
        yield 'forty-nine pairs' => [99, 49, 80752];
    }

    #[DataProvider('qualifyingQuantities')]
    public function testItDiscountsEveryCompletePairByRoundingEachPairIndependently(int $quantity, int $expectedPairs, int $expectedDiscountCents): void
    {
        $appliedOffer = $this->offer->apply(new BasketLine($this->redWidget, $quantity));

        self::assertNotNull($appliedOffer);
        self::assertSame('R01', $appliedOffer->productCode);
        self::assertSame($expectedPairs, $appliedOffer->timesApplied);
        self::assertSame($expectedDiscountCents, $appliedOffer->discountCents);
    }

    public function testASingleRedWidgetStaysFullPrice(): void
    {
        self::assertNull($this->offer->apply(new BasketLine($this->redWidget, 1)));
    }

    public function testItIgnoresOtherProducts(): void
    {
        $greenWidgets = new BasketLine(new Product('G01', 'Green Widget', 2495), 4);

        self::assertNull($this->offer->apply($greenWidgets));
        self::assertNull($this->offer->apply());
    }

    public function testAnEvenPriceIsHalvedExactly(): void
    {
        $offer = new BuyOneGetSecondHalfPriceOffer('E01');

        $appliedOffer = $offer->apply(new BasketLine(new Product('E01', 'Even Widget', 1000), 2));

        self::assertSame(500, $appliedOffer?->discountCents);
    }

    public function testItAdvertisesThePromotionOnlyForItsProduct(): void
    {
        self::assertSame('Second one half price', $this->offer->promotionFor($this->redWidget));
        self::assertNull($this->offer->promotionFor(new Product('B01', 'Blue Widget', 795)));
    }
}
