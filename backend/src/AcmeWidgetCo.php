<?php

declare(strict_types=1);

namespace Acme;

use Acme\Basket\Basket;
use Acme\Catalogue\Product;
use Acme\Catalogue\ProductCatalogue;
use Acme\Delivery\DeliveryPolicy;
use Acme\Delivery\DeliveryTier;
use Acme\Delivery\TieredDeliveryPolicy;
use Acme\Offer\BuyOneGetSecondHalfPriceOffer;

final class AcmeWidgetCo
{
    public static function catalogue(): ProductCatalogue
    {
        return new ProductCatalogue(
            new Product('R01', 'Red Widget', 3295),
            new Product('G01', 'Green Widget', 2495),
            new Product('B01', 'Blue Widget', 795),
        );
    }

    public static function deliveryPolicy(): DeliveryPolicy
    {
        return new TieredDeliveryPolicy(
            new DeliveryTier(minimumSubtotalCents: 0, chargeCents: 495),
            new DeliveryTier(minimumSubtotalCents: 5000, chargeCents: 295),
            new DeliveryTier(minimumSubtotalCents: 9000, chargeCents: 0),
        );
    }

    public static function offers(): array
    {
        return [new BuyOneGetSecondHalfPriceOffer('R01')];
    }

    public static function newBasket(): Basket
    {
        return new Basket(self::catalogue(), self::deliveryPolicy(), ...self::offers());
    }
}
