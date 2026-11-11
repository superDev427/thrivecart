<?php

declare(strict_types=1);

namespace Acme\Http;

final readonly class Request
{
    public function __construct(
        public string $method,
        public string $path,
        public string $body = '',
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = is_string($uri) ? parse_url($uri, PHP_URL_PATH) : '/';
        $body = file_get_contents('php://input');

        return new self(
            is_string($method) ? strtoupper($method) : 'GET',
            is_string($path) ? $path : '/',
            is_string($body) ? $body : '',
        );
    }
}
