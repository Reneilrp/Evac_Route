<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'api_key_id',
    'key_name',
    'ip_address',
    'method',
    'endpoint',
    'status_code',
    'duration_ms',
    'user_agent',
    'created_at',
])]
class ApiKeyLog extends Model
{
    public $timestamps = false;

    protected $casts = [
        'created_at' => 'datetime',
        'status_code' => 'integer',
        'duration_ms' => 'float',
    ];

    public function apiKey(): BelongsTo
    {
        return $this->belongsTo(ApiKey::class);
    }
}
