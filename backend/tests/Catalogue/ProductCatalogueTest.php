<?php

declare(strict_types=1);

namespace Acme\Tests\Catalogue;

use Acme\Catalogue\Product;
use Acme\Catalogue\ProductCatalogue;
use Acme\Catalogue\UnknownProductException;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class ProductCatalogueTest extends TestCase
{
    public function testItFindsProductsByCodeAndKeepsTheirOrder(): void
    {
        $red = new Product('R01', 'Red Widget', 3295);
        $blue = new Product('B01', 'Blue Widget', 795);
        $catalogue = new ProductCatalogue($red, $blue);

        self::assertSame($blue, $catalogue->find('B01'));
        self::assertSame([$red, $blue], $catalogue->products());
    }

    public function testItRejectsUnknownCodes(): void
    {
        $this->expectException(UnknownProductException::class);
        $this->expectExceptionMessage('Unknown product code "r01".');

        (new ProductCatalogue(new Product('R01', 'Red Widget', 3295)))->find('r01');
    }

    public function testItRejectsDuplicateCodes(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new ProductCatalogue(new Product('R01', 'Red Widget', 3295), new Product('R01', 'Another Red Widget', 100));
    }
}
