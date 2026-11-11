<?php

declare(strict_types=1);

use Acme\AcmeWidgetCo;
use Acme\Http\Request;

require dirname(__DIR__) . '/vendor/autoload.php';

ini_set('display_errors', '0');

set_error_handler(static function (int $severity, string $message, string $file, int $line): never {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

AcmeWidgetCo::api()->handle(Request::fromGlobals())->send();
