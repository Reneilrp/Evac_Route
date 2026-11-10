<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'headcount', 'contact_number', 'barangay', 'qr_code_hash', 'transportation_mode'])]
class FamilyProfile extends Model
{
    protected $appends = ['name', 'family_name'];

    public function getNameAttribute()
    {
        return $this->user?->name;
    }

    public function getFamilyNameAttribute()
    {
        return $this->user?->name;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function evacuationLogs()
    {
        return $this->hasMany(EvacuationLog::class);
    }

    public static function verifyTotpPayload($payload, $lock = false)
    {
        $payload = trim((string) $payload);
        $parts = explode(':', $payload);
        if (count($parts) !== 3) {
            // Fallback for static QR codes or manual hash entry
            $query = self::where('qr_code_hash', $payload);
            if ($lock) {
                $query->lockForUpdate();
            }

            return $query->firstOrFail();
        }

        [$familyId, $timestamp, $hmac] = $parts;

        $candidates = [];

        // 1. Primary lookup by family_profiles.id
        $byIdQuery = self::where('id', $familyId);
        if ($lock) {
            $byIdQuery->lockForUpdate();
        }
        $byId = $byIdQuery->first();
        if ($byId) {
            $candidates[] = $byId;
        }

        // 2. Fallback lookup by user_id (handles mobile clients that signed using user.id)
        $byUserQuery = self::where('user_id', $familyId);
        if ($lock) {
            $byUserQuery->lockForUpdate();
        }
        $byUser = $byUserQuery->first();
        if ($byUser && (! $byId || $byUser->id !== $byId->id)) {
            $candidates[] = $byUser;
        }

        if (empty($candidates)) {
            throw (new self)->newModelNotFoundException();
        }

        $matchedFamily = null;
        foreach ($candidates as $candidate) {
            $validSecrets = array_filter([
                $candidate->qr_code_hash,
                // Allow legacy fallback hash only when candidate's user_id matches the signed ID
                (string) $candidate->user_id === (string) $familyId ? 'hash_'.$familyId : null,
                (string) $candidate->user_id === (string) $familyId ? 'family_hash_'.$familyId : null,
            ]);

            foreach ($validSecrets as $secret) {
                $expectedHmac = hash('sha256', $familyId.':'.$timestamp.$secret);
                if (hash_equals($expectedHmac, $hmac)) {
                    $matchedFamily = $candidate;
                    break 2;
                }
            }
        }

        if (! $matchedFamily) {
            throw new \Exception('Invalid QR Signature');
        }

        if (abs(now()->timestamp - (int) $timestamp) > 300) {
            throw new \Exception('QR Code Expired. Please refresh your app.');
        }

        return $matchedFamily;
    }
}
