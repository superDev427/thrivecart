<?php

declare(strict_types=1);

namespace Acme\Tests\Http;

use Acme\AcmeWidgetCo;
use Acme\Basket\BasketLine;
use Acme\Catalogue\Product;
use Acme\Http\JsonResponse;
use Acme\Http\QuoteRequestParser;
use Acme\Http\Request;
use Acme\Http\ShopApi;
use Acme\Offer\AppliedOffer;
use Acme\Offer\Offer;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class ShopApiTest extends TestCase
{
    public function testItListsTheCatalogueWithPromotions(): void
    {
        $response = AcmeWidgetCo::api()->handle(new Request('GET', '/api/products'));

        self::assertSame(200, $response->status);
        self::assertSame([
            'currency' => 'USD',
            'maximumQuantityPerProduct' => 99,
            'products' => [
                ['code' => 'R01', 'name' => 'Red Widget', 'unitPriceCents' => 3295, 'promotions' => ['Second one half price']],
                ['code' => 'G01', 'name' => 'Green Widget', 'unitPriceCents' => 2495, 'promotions' => []],
                ['code' => 'B01', 'name' => 'Blue Widget', 'unitPriceCents' => 795, 'promotions' => []],
            ],
        ], $this->decode($response));
    }

    public function testItQuotesABasketWithAFullBreakdown(): void
    {
        $response = $this->quote(['items' => [['code' => 'B01', 'quantity' => 1], ['code' => 'R01', 'quantity' => 2]]]);

        self::assertSame(200, $response->status);
        self::assertSame([
            'currency' => 'USD',
            'itemCount' => 3,
            'lines' => [
                ['code' => 'R01', 'name' => 'Red Widget', 'quantity' => 2, 'unitPriceCents' => 3295, 'subtotalCents' => 6590, 'discountCents' => 1648, 'totalCents' => 4942],
                ['code' => 'B01', 'name' => 'Blue Widget', 'quantity' => 1, 'unitPriceCents' => 795, 'subtotalCents' => 795, 'discountCents' => 0, 'totalCents' => 795],
            ],
            'appliedOffers' => [
                ['productCode' => 'R01', 'description' => 'Buy one Red Widget, get the second half price', 'timesApplied' => 1, 'discountCents' => 1648],
            ],
            'subtotalCents' => 7385,
            'discountCents' => 1648,
            'discountedSubtotalCents' => 5737,
            'deliveryCents' => 295,
            'nextDeliveryTier' => ['thresholdCents' => 9000, 'deliveryCents' => 0, 'remainingCents' => 3263],
            'totalCents' => 6032,
        ], $this->decode($response));
    }

    public static function totalsFromTheBrief(): iterable
    {
        yield 'B01, G01' => [[['code' => 'B01', 'quantity' => 1], ['code' => 'G01', 'quantity' => 1]], 3785];
        yield 'R01, R01' => [[['code' => 'R01', 'quantity' => 2]], 5437];
        yield 'R01, G01' => [[['code' => 'R01', 'quantity' => 1], ['code' => 'G01', 'quantity' => 1]], 6085];
        yield 'B01, B01, R01, R01, R01' => [[['code' => 'B01', 'quantity' => 2], ['code' => 'R01', 'quantity' => 3]], 9827];
    }

    #[DataProvider('totalsFromTheBrief')]
    public function testItReturnsTheTotalsFromTheBrief(array $items, int $expectedTotalCents): void
    {
        self::assertSame($expectedTotalCents, $this->decode($this->quote(['items' => $items]))['totalCents']);
    }

    public function testAnEmptyBasketIsValidAndFree(): void
    {
        $quote = $this->decode($this->quote(['items' => []]));

        self::assertSame([], $quote['lines']);
        self::assertSame(0, $quote['deliveryCents']);
        self::assertNull($quote['nextDeliveryTier']);
        self::assertSame(0, $quote['totalCents']);
    }

    public function testDuplicateCodesAreCombinedIntoOneLine(): void
    {
        $quote = $this->decode($this->quote(['items' => [['code' => 'R01', 'quantity' => 1], ['code' => 'R01', 'quantity' => 1]]]));

        self::assertCount(1, $quote['lines']);
        self::assertSame(2, $quote['lines'][0]['quantity']);
        self::assertSame(5437, $quote['totalCents']);
    }

    public function testTheQuantityLimitAppliesAfterCombiningDuplicates(): void
    {
        $atLimit = $this->quote(['items' => [['code' => 'B01', 'quantity' => 50], ['code' => 'B01', 'quantity' => 49]]]);
        $overLimit = $this->quote(['items' => [['code' => 'B01', 'quantity' => 50], ['code' => 'B01', 'quantity' => 50]]]);

        self::assertSame(200, $atLimit->status);
        $this->assertError($overLimit, 422, 'invalid_request', 'The combined quantity of B01 cannot exceed 99.');
    }

    public function testClientSuppliedPricesAreIgnored(): void
    {
        $quote = $this->decode($this->quote(['items' => [['code' => 'R01', 'quantity' => 1, 'unitPriceCents' => 1]], 'totalCents' => 1]));

        self::assertSame(3295, $quote['lines'][0]['unitPriceCents']);
        self::assertSame(3790, $quote['totalCents']);
    }

    public static function invalidQuantities(): iterable
    {
        yield 'zero' => [0];
        yield 'negative' => [-1];
        yield 'above the limit' => [100];
        yield 'fractional' => [1.5];
        yield 'whole number written as a decimal' => [2.0];
        yield 'numeric string' => ['2'];
        yield 'null' => [null];
    }

    #[DataProvider('invalidQuantities')]
    public function testItRejectsInvalidQuantities(mixed $quantity): void
    {
        $response = $this->quote(['items' => [['code' => 'R01', 'quantity' => $quantity]]]);

        $this->assertError($response, 422, 'invalid_request', 'items[0].quantity must be a whole number from 1 to 99.');
    }

    public function testItRejectsUnknownProductCodes(): void
    {
        $response = $this->quote(['items' => [['code' => 'R01', 'quantity' => 1], ['code' => 'Z99', 'quantity' => 1]]]);

        $this->assertError($response, 422, 'unknown_product', 'Unknown product code "Z99".');
    }

    public static function malformedPayloads(): iterable
    {
        yield 'missing items' => ['{}', 'The request body must be a JSON object with an "items" array.'];
        yield 'items is an object' => ['{"items":{"code":"R01"}}', 'The request body must be a JSON object with an "items" array.'];
        yield 'top-level array' => ['[{"code":"R01","quantity":1}]', 'The request body must be a JSON object with an "items" array.'];
        yield 'item is not an object' => ['{"items":["R01"]}', 'items[0] must be an object with a code and a quantity.'];
        yield 'missing code' => ['{"items":[{"quantity":1}]}', 'items[0].code must be a non-empty string.'];
        yield 'numeric code' => ['{"items":[{"code":101,"quantity":1}]}', 'items[0].code must be a non-empty string.'];
        yield 'blank code' => ['{"items":[{"code":"  ","quantity":1}]}', 'items[0].code must be a non-empty string.'];
    }

    #[DataProvider('malformedPayloads')]
    public function testItRejectsMalformedPayloads(string $body, string $expectedMessage): void
    {
        $response = AcmeWidgetCo::api()->handle(new Request('POST', '/api/basket/quote', $body));

        $this->assertError($response, 422, 'invalid_request', $expectedMessage);
    }

    public function testItRejectsInvalidJson(): void
    {
        $response = AcmeWidgetCo::api()->handle(new Request('POST', '/api/basket/quote', '{"items": [}'));

        $this->assertError($response, 400, 'malformed_json', 'The request body must be valid JSON.');
    }

    public function testItRejectsAnEmptyBody(): void
    {
        $response = AcmeWidgetCo::api()->handle(new Request('POST', '/api/basket/quote'));

        $this->assertError($response, 400, 'malformed_json', 'The request body must be valid JSON.');
    }

    public function testUnknownPathsAreNotFound(): void
    {
        $response = AcmeWidgetCo::api()->handle(new Request('GET', '/api/orders'));

        $this->assertError($response, 404, 'not_found', 'No API endpoint exists at this path.');
    }

    public function testTheWrongMethodIsRejectedWithTheAllowedMethod(): void
    {
        $response = AcmeWidgetCo::api()->handle(new Request('GET', '/api/basket/quote'));

        $this->assertError($response, 405, 'method_not_allowed', 'Use POST for this endpoint.');
        self::assertSame(['Allow' => 'POST'], $response->headers);
    }

    public function testUnexpectedFailuresHideTheirDetails(): void
    {
        $failingOffer = new class () implements Offer {
            public function apply(BasketLine ...$lines): ?AppliedOffer
            {
                throw new RuntimeException('Secret internal detail');
            }

            public function promotionFor(Product $product): ?string
            {
                return null;
            }
        };

        $api = new ShopApi(AcmeWidgetCo::catalogue(), AcmeWidgetCo::deliveryPolicy(), new QuoteRequestParser(99), 'USD', $failingOffer);
        $logFile = tempnam(sys_get_temp_dir(), 'acme');
        $previousLog = ini_set('error_log', (string) $logFile);

        try {
            $response = $api->handle(new Request('POST', '/api/basket/quote', '{"items":[{"code":"R01","quantity":1}]}'));
        } finally {
            ini_set('error_log', (string) $previousLog);
        }

        $this->assertError($response, 500, 'server_error', 'Something went wrong on our side. Please try again.');
        self::assertStringNotContainsString('Secret', $response->encodedBody());
        self::assertStringNotContainsString('.php', $response->encodedBody());
        self::assertStringContainsString('Secret internal detail', (string) file_get_contents((string) $logFile));

        unlink((string) $logFile);
    }

    private function quote(array $payload): JsonResponse
    {
        return AcmeWidgetCo::api()->handle(new Request('POST', '/api/basket/quote', json_encode($payload, JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION)));
    }

    private function decode(JsonResponse $response): array
    {
        $decoded = json_decode($response->encodedBody(), true, 512, JSON_THROW_ON_ERROR);
        self::assertIsArray($decoded);

        return $decoded;
    }

    private function assertError(JsonResponse $response, int $status, string $code, string $message): void
    {
        self::assertSame($status, $response->status);
        self::assertSame(['error' => ['code' => $code, 'message' => $message]], $this->decode($response));
    }
}
