<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'headcount', 'contact_number', 'barangay', 'qr_code_hash', 'transportation_mode'])]
class FamilyProfile extends Model
{
    protected $appends = ['name'];

    public function getNameAttribute()
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
        $parts = explode(':', $payload);
        if (count($parts) !== 3) {
            // Fallback for old static QR codes during migration
            $query = self::where('qr_code_hash', $payload);
            if ($lock) $query->lockForUpdate();
            return $query->firstOrFail();
        }

        [$familyId, $timestamp, $hmac] = $parts;

        $query = self::where('id', $familyId);
        if ($lock) $query->lockForUpdate();
        $family = $query->firstOrFail();

        $expectedHmac = hash('sha256', $familyId . ':' . $timestamp . $family->qr_code_hash);

        if (!hash_equals($expectedHmac, $hmac)) {
            throw new \Exception('Invalid QR Signature');
        }

        if (abs(now()->timestamp - (int)$timestamp) > 120) {
            throw new \Exception('QR Code Expired. Please refresh your app.');
        }

        return $family;
    }
}
