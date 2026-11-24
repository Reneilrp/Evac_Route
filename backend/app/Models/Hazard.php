<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'name', 'latitude', 'longitude', 'location', 'radius_meters',
    'geometry_type', 'corridor_coordinates', 'estimated_duration_hours',
    'is_active', 'reported_by', 'hazard_type', 'severity_level',
    'is_fixed_flood_spot', 'disaster_category', 'barangay', 'origin_type', 'preset_key',
    'pending_incident_id', 'validation_status', 'is_validated_by_cdrrmo', 'validated_by', 'validated_at'
])]
class Hazard extends Model
{
    protected $hidden = ['location'];

    protected $casts = [
        'corridor_coordinates' => 'array',
        'is_validated_by_cdrrmo' => 'boolean',
        'validated_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        // Automatically sync the POINT column for R-tree spatial indexing
        static::saving(function ($hazard) {
            if (\DB::getDriverName() !== 'sqlite' && $hazard->latitude && $hazard->longitude) {
                // For MySQL/MariaDB WGS 84 (SRID 4326): POINT(latitude longitude)
                $hazard->location = \DB::raw("ST_GeomFromText('POINT({$hazard->latitude} {$hazard->longitude})', 4326)");
            }
        });
    }

    public function reportedBy()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function validator()
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function pendingIncident()
    {
        return $this->belongsTo(PendingIncident::class, 'pending_incident_id');
    }
}
