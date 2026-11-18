<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

#[Fillable(['name', 'key', 'is_active', 'requests_count', 'last_used_at', 'last_ip', 'expires_at'])]
class ApiKey extends Model
{
    protected $casts = [
        'is_active' => 'boolean',
        'requests_count' => 'integer',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    protected $appends = [
        'masked_key',
        'status_label',
    ];

    /**
     * Check if the API key is currently valid.
     */
    public function isValid(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }

    /**
     * Masked preview of key (e.g. evac_live_8f3a...b24c)
     */
    protected function maskedKey(): Attribute
    {
        return Attribute::make(
            get: function () {
                $len = strlen($this->key);
                if ($len <= 16) {
                    return $this->key;
                }
                return substr($this->key, 0, 14) . '...' . substr($this->key, -4);
            }
        );
    }

    /**
     * Friendly status label (Active, Revoked, Expired)
     */
    protected function statusLabel(): Attribute
    {
        return Attribute::make(
            get: function () {
                if (! $this->is_active) {
                    return 'revoked';
                }
                if ($this->expires_at && $this->expires_at->isPast()) {
                    return 'expired';
                }
                return 'active';
            }
        );
    }

    /**
     * Record usage timestamp, increment requests counter, and capture IP
     */
    public function recordUsage(?string $ip = null): void
    {
        $this->increment('requests_count', 1, [
            'last_used_at' => now(),
            'last_ip' => $ip,
        ]);
    }

    /**
     * Generate a new unique API key.
     */
    public static function generate(string $name, ?\DateTimeInterface $expiresAt = null): self
    {
        $rawKey = 'evac_live_' . Str::random(40);

        return self::create([
            'name' => $name,
            'key' => $rawKey,
            'is_active' => true,
            'requests_count' => 0,
            'expires_at' => $expiresAt,
        ]);
    }
}
