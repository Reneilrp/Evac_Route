<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EarthquakeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EarthquakeController extends Controller
{
    protected EarthquakeService $earthquakeService;

    public function __construct(EarthquakeService $earthquakeService)
    {
        $this->earthquakeService = $earthquakeService;
    }

    /**
     * Get recent earthquakes near Zamboanga City or within region
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $radiusKm = (float) $request->input('radius_km', 350);
        $minMagnitude = (float) $request->input('min_magnitude', 2.5);
        $limit = min((int) $request->input('limit', 20), 50);

        $earthquakes = $this->earthquakeService->getRecentEarthquakes($radiusKm, $minMagnitude, $limit);

        return response()->json([
            'status' => 'success',
            'data' => $earthquakes,
            'meta' => [
                'count' => count($earthquakes),
                'center' => [
                    'latitude' => EarthquakeService::ZAMBOANGA_LAT,
                    'longitude' => EarthquakeService::ZAMBOANGA_LNG,
                    'city' => 'Zamboanga City',
                ],
                'radius_km' => $radiusKm,
                'min_magnitude' => $minMagnitude,
            ],
        ]);
    }
}
