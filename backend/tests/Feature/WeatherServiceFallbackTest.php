<?php

use App\Services\WeatherService;
use Illuminate\Support\Facades\Http;

test('uses openweathermap when api key is provided and request succeeds', function () {
    config(['services.openweather.key' => 'test_owm_key']);

    Http::fake([
        'api.openweathermap.org/*' => Http::response([
            'weather' => [['main' => 'Rain', 'id' => 501]],
        ]),
        'api.open-meteo.com/*' => Http::response([], 500),
    ]);

    $service = new WeatherService;
    expect($service->isCurrentlyRaining())->toBeTrue();

    Http::assertSent(fn ($request) => str_contains($request->url(), 'api.openweathermap.org'));
    Http::assertNotSent(fn ($request) => str_contains($request->url(), 'api.open-meteo.com'));
});

test('falls back to open-meteo when openopenweathermap fails', function () {
    config(['services.openweather.key' => 'test_owm_key']);

    Http::fake([
        'api.openweathermap.org/*' => Http::response(['message' => 'Unauthorized'], 401),
        'api.open-meteo.com/*' => Http::response([
            'current' => [
                'rain' => 2.5,
                'showers' => 0.0,
                'weather_code' => 61,
            ],
        ]),
    ]);

    $service = new WeatherService;
    expect($service->isCurrentlyRaining())->toBeTrue();

    Http::assertSent(fn ($request) => str_contains($request->url(), 'api.openweathermap.org'));
    Http::assertSent(fn ($request) => str_contains($request->url(), 'api.open-meteo.com'));
});

test('uses open-meteo directly when openopenweathermap key is missing', function () {
    config(['services.openweather.key' => '']);

    Http::fake([
        'api.open-meteo.com/*' => Http::response([
            'current' => [
                'rain' => 0.0,
                'showers' => 0.0,
                'weather_code' => 0,
            ],
        ]),
    ]);

    $service = new WeatherService;
    expect($service->isCurrentlyRaining())->toBeFalse();

    Http::assertNotSent(fn ($request) => str_contains($request->url(), 'api.openweathermap.org'));
    Http::assertSent(fn ($request) => str_contains($request->url(), 'api.open-meteo.com'));
});
