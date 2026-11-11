<?php

declare(strict_types=1);

namespace Acme\Http;

final readonly class JsonResponse
{
    public function __construct(
        public int $status,
        public array $body,
        public array $headers = [],
    ) {
    }

    public static function error(int $status, string $code, string $message, array $headers = []): self
    {
        return new self($status, ['error' => ['code' => $code, 'message' => $message]], $headers);
    }

    public function encodedBody(): string
    {
        return json_encode($this->body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    public function send(): void
    {
        $encodedBody = $this->encodedBody();

        http_response_code($this->status);
        header_remove('X-Powered-By');
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');

        foreach ($this->headers as $name => $value) {
            header("{$name}: {$value}");
        }

        echo $encodedBody;
    }
}
