<?php

declare(strict_types=1);

namespace Acme\Catalogue;

use InvalidArgumentException;

final readonly class ProductCatalogue
{
    private array $productsByCode;

    public function __construct(Product ...$products)
    {
        $productsByCode = [];

        foreach ($products as $product) {
            if (isset($productsByCode[$product->code])) {
                throw new InvalidArgumentException("Product code {$product->code} appears more than once in the catalogue.");
            }

            $productsByCode[$product->code] = $product;
        }

        $this->productsByCode = $productsByCode;
    }

    public function find(string $code): Product
    {
        return $this->productsByCode[$code] ?? throw new UnknownProductException($code);
    }

    public function products(): array
    {
        return array_values($this->productsByCode);
    }
}
