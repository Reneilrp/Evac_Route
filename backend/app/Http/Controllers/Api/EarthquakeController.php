<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcknowledgedEarthquake;
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

        $acknowledgedIds = [];
        try {
            $acknowledgedIds = AcknowledgedEarthquake::pluck('usgs_id')->toArray();
        } catch (\Throwable $e) {
            \Log::warning('Could not load acknowledged earthquakes: ' . $e->getMessage());
        }

        $earthquakes = array_map(function ($eq) use ($acknowledgedIds) {
            $eq['is_acknowledged'] = in_array($eq['id'], $acknowledgedIds);
            return $eq;
        }, $earthquakes);

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

    /**
     * Acknowledge an earthquake by USGS ID (CDRRMO action).
     *
     * @param Request $request
     * @param string $usgsId
     * @return JsonResponse
     */
    public function acknowledge(Request $request, string $usgsId): JsonResponse
    {
        $acknowledgedBy = $request->user()->name
            ?? $request->user()->email
            ?? 'CDRRMO';

        AcknowledgedEarthquake::updateOrCreate(
            ['usgs_id' => $usgsId],
            [
                'acknowledged_by' => $acknowledgedBy,
                'acknowledged_at' => now(),
            ]
        );

        return response()->json([
            'status' => 'acknowledged',
            'usgs_id' => $usgsId,
        ]);
    }

    /**
     * Return all acknowledged USGS event IDs.
     *
     * @return JsonResponse
     */
    public function acknowledgedIds(): JsonResponse
    {
        $ids = [];
        try {
            $ids = AcknowledgedEarthquake::pluck('usgs_id')->toArray();
        } catch (\Throwable $e) {
            \Log::warning('Could not load acknowledged earthquake IDs: ' . $e->getMessage());
        }

        return response()->json([
            'status' => 'success',
            'data' => $ids,
        ]);
    }
}
