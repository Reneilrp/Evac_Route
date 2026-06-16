<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoadMaintenance extends Model
{
    use HasFactory;

    protected $table = 'road_maintenances';

    protected $fillable = [
        'description',
        'start_latitude',
        'start_longitude',
        'end_latitude',
        'end_longitude',
        'estimated_duration_hours',
        'is_active',
        'reported_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_latitude' => 'float',
        'start_longitude' => 'float',
        'end_latitude' => 'float',
        'end_longitude' => 'float',
        'estimated_duration_hours' => 'integer',
    ];

    /**
     * Get the user who reported this road maintenance block.
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
