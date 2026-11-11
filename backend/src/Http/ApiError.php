<?php

declare(strict_types=1);

namespace Acme\Http;

use RuntimeException;

final class ApiError extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
    ) {
        parent::__construct($message);
    }

    public static function invalidRequest(string $message): self
    {
        return new self(422, 'invalid_request', $message);
    }
}
