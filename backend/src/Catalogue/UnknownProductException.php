<?php

declare(strict_types=1);

namespace Acme\Catalogue;

use InvalidArgumentException;

final class UnknownProductException extends InvalidArgumentException
{
    public function __construct(public readonly string $productCode)
    {
        parent::__construct(sprintf('Unknown product code "%s".', $productCode));
    }
}
