<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->user()->status === 'inactive') {
            // Revoke current token immediately if it exists to prevent further authentication attempts
            $token = $request->user()->currentAccessToken();
            if ($token) {
                $token->delete();
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Your account is deactivated. Session terminated.'
            ], 403);
        }

        return $next($request);
    }
}
