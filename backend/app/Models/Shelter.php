<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'name',
    'type',
    'latitude',
    'longitude',
    'max_capacity',
    'current_occupancy',
    'status',
    'pinned_by',
    'facility_type',
    'is_secured_facility',
    'emergency_contact',
    'elevation_meters',
    'amenities',
    'transport_schedule',
    'barangay',
    'district',
    'floor_area',
])]
class Shelter extends Model
{
    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'floor_area' => 'float',
        'max_capacity' => 'integer',
        'current_occupancy' => 'integer',
        'elevation_meters' => 'integer',
        'is_secured_facility' => 'boolean',
    ];

    /**
     * The accessors to append to the model's array form.
     */
    protected $appends = [
        'capacity',
        'available_capacity',
        'coordinates',
        'location',
        'floor_area_sqm',
    ];

    public function pinnedBy()
    {
        return $this->belongsTo(User::class, 'pinned_by');
    }

    public function evacuationLogs()
    {
        return $this->hasMany(EvacuationLog::class);
    }

    /**
     * Capacity accessor (alias for max_capacity)
     */
    protected function capacity(): Attribute
    {
        return Attribute::make(
            get: fn () => (int) $this->max_capacity,
        );
    }

    /**
     * Available remaining capacity
     */
    protected function availableCapacity(): Attribute
    {
        return Attribute::make(
            get: fn () => max(0, (int) $this->max_capacity - (int) $this->current_occupancy),
        );
    }

    /**
     * GeoJSON-style [lng, lat] coordinate pair
     */
    protected function coordinates(): Attribute
    {
        return Attribute::make(
            get: fn () => [
                (float) $this->longitude,
                (float) $this->latitude,
            ],
        );
    }

    /**
     * Location alias for barangay
     */
    protected function location(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->barangay,
        );
    }

    /**
     * Floor area in sq.m. alias
     */
    protected function floorAreaSqm(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->floor_area !== null ? (float) $this->floor_area : null,
        );
    }

    /**
     * Convert to standard GeoJSON Feature (RFC 7946)
     */
    public function toGeoJsonFeature(): array
    {
        return [
            'type' => 'Feature',
            'id' => $this->id,
            'geometry' => [
                'type' => 'Point',
                'coordinates' => [(float) $this->longitude, (float) $this->latitude],
            ],
            'properties' => [
                'id' => $this->id,
                'name' => $this->name,
                'barangay' => $this->barangay,
                'location' => $this->barangay,
                'district' => $this->district,
                'floor_area' => $this->floor_area !== null ? (float) $this->floor_area : null,
                'floor_area_sqm' => $this->floor_area !== null ? (float) $this->floor_area : null,
                'capacity' => (int) $this->max_capacity,
                'max_capacity' => (int) $this->max_capacity,
                'current_occupancy' => (int) $this->current_occupancy,
                'available_capacity' => max(0, (int) $this->max_capacity - (int) $this->current_occupancy),
                'type' => $this->type,
                'facility_type' => $this->facility_type,
                'status' => $this->status,
                'elevation_meters' => $this->elevation_meters !== null ? (int) $this->elevation_meters : null,
                'is_secured_facility' => (bool) $this->is_secured_facility,
                'emergency_contact' => $this->emergency_contact,
            ],
        ];
    }
}
