<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use App\Models\ApiKeyLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class RequireApiKey
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        // 1. If the request is already authenticated via Sanctum (e.g. LGU Admin, Rescuer), pass through
        if ($request->user('sanctum') || auth()->check()) {
            return $next($request);
        }

        // 2. Extract API Key from supported sources:
        //    - Header: X-API-KEY / x-api-key
        //    - Query parameter: ?api_key=...
        //    - Header: Authorization: Bearer <key>
        $apiKey = $request->header('X-API-KEY')
            ?? $request->header('x-api-key')
            ?? $request->query('api_key')
            ?? $request->bearerToken();

        if (empty($apiKey)) {
            $this->logActivity(null, 'Missing Key', $request, 401, $startTime);

            return response()->json([
                'status' => 'error',
                'message' => "Unauthorized. A valid API key is required. Pass it via 'X-API-KEY' header or '?api_key=' query parameter.",
            ], 401);
        }

        // 3. Check environment master key (configured in .env SHELTER_API_KEY)
        $masterKey = config('services.shelter_api.key', env('SHELTER_API_KEY'));
        if (! empty($masterKey) && hash_equals((string) $masterKey, (string) $apiKey)) {
            $response = $next($request);
            $this->logActivity(null, 'Master Key (.env)', $request, $response->getStatusCode(), $startTime);
            return $response;
        }

        // 4. Check database-backed API keys
        $keyRecord = ApiKey::where('key', $apiKey)->first();

        if (! $keyRecord || ! $keyRecord->isValid()) {
            $this->logActivity($keyRecord, $keyRecord?->name ?? 'Invalid Key', $request, 401, $startTime);

            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. The provided API key is invalid, revoked, or expired.',
            ], 401);
        }

        // 5. Update last used timestamp, IP address, and atomic request counter
        $keyRecord->recordUsage($request->ip());

        $response = $next($request);

        // 6. Record detailed access log
        $this->logActivity($keyRecord, $keyRecord->name, $request, $response->getStatusCode(), $startTime);

        return $response;
    }

    /**
     * Safely log API request metadata
     */
    protected function logActivity(?ApiKey $key, string $keyName, Request $request, int $statusCode, float $startTime): void
    {
        try {
            $durationMs = round((microtime(true) - $startTime) * 1000, 2);

            ApiKeyLog::create([
                'api_key_id' => $key?->id,
                'key_name' => $keyName,
                'ip_address' => $request->ip() ?: '127.0.0.1',
                'method' => $request->method(),
                'endpoint' => Str::limit($request->getRequestUri(), 250),
                'status_code' => $statusCode,
                'duration_ms' => $durationMs,
                'user_agent' => Str::limit($request->userAgent() ?: 'Unknown Client', 490),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Fail silently so database log issues never break API responses
        }
    }
}
