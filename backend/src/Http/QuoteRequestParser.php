<?php

declare(strict_types=1);

namespace Acme\Http;

use JsonException;
use stdClass;

final readonly class QuoteRequestParser
{
    public function __construct(public int $maximumQuantityPerProduct)
    {
    }

    public function parse(string $body): array
    {
        $payload = $this->decode($body);

        if (!$payload instanceof stdClass || !isset($payload->items) || !is_array($payload->items) || !array_is_list($payload->items)) {
            throw ApiError::invalidRequest('The request body must be a JSON object with an "items" array.');
        }

        $quantitiesByCode = [];

        foreach ($payload->items as $index => $item) {
            [$code, $quantity] = $this->parseItem($item, $index);
            $quantitiesByCode[$code] = ($quantitiesByCode[$code] ?? 0) + $quantity;

            if ($quantitiesByCode[$code] > $this->maximumQuantityPerProduct) {
                throw ApiError::invalidRequest("The combined quantity of {$code} cannot exceed {$this->maximumQuantityPerProduct}.");
            }
        }

        return $quantitiesByCode;
    }

    private function decode(string $body): mixed
    {
        try {
            return json_decode($body, false, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiError(400, 'malformed_json', 'The request body must be valid JSON.');
        }
    }

    private function parseItem(mixed $item, int $index): array
    {
        if (!$item instanceof stdClass) {
            throw ApiError::invalidRequest("items[{$index}] must be an object with a code and a quantity.");
        }

        $code = $item->code ?? null;

        if (!is_string($code) || trim($code) === '') {
            throw ApiError::invalidRequest("items[{$index}].code must be a non-empty string.");
        }

        $quantity = $item->quantity ?? null;

        if (!is_int($quantity) || $quantity < 1 || $quantity > $this->maximumQuantityPerProduct) {
            throw ApiError::invalidRequest("items[{$index}].quantity must be a whole number from 1 to {$this->maximumQuantityPerProduct}.");
        }

        return [$code, $quantity];
    }
}
