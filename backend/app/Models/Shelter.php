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
    'allowed_hazards',
    'is_secured_facility',
    'emergency_contact',
    'elevation_meters',
    'amenities',
    'transport_schedule',
    'barangay',
    'district',
    'floor_area',
    'activation_status',
    'activation_trigger',
    'activated_at',
    'cswd_mobilized',
    'cswd_mobilized_at',
    'cswd_mobilized_team',
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
        'cswd_mobilized' => 'boolean',
        'activated_at' => 'datetime',
        'cswd_mobilized_at' => 'datetime',
        'allowed_hazards' => 'array',
    ];

    /**
     * The accessors to append to the model's array form.
     */
    protected $appends = [
        'capacity',
        'available_capacity',
        'current_idps',
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

    public function donations()
    {
        return $this->hasMany(ShelterDonation::class);
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
     * IDP Count alias for current_occupancy (CDRRMO Standard Terminology)
     */
    protected function currentIdps(): Attribute
    {
        return Attribute::make(
            get: fn () => (int) $this->current_occupancy,
        );
    }

    /**
     * Check if shelter is authorized and structurally safe for a given hazard
     */
    public function isSafeForHazard(?string $hazardType): bool
    {
        if (!$hazardType) {
            return true;
        }

        $hazard = strtolower(trim($hazardType));

        // Earthquake: strictly exclude covered courts and enclosed/multi-story buildings
        if ($hazard === 'earthquake') {
            if (in_array($this->facility_type, ['covered_court', 'multi_story_building', 'enclosed_building'])) {
                return false;
            }
            if ($this->facility_type === 'open_field') {
                return true;
            }
            if (is_array($this->allowed_hazards) && in_array('earthquake', $this->allowed_hazards)) {
                return true;
            }
            return false;
        }

        if (is_array($this->allowed_hazards) && !empty($this->allowed_hazards)) {
            return in_array($hazard, $this->allowed_hazards) || in_array('all', $this->allowed_hazards) || in_array('general', $this->allowed_hazards);
        }

        return true;
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
                'current_idps' => (int) $this->current_occupancy,
                'available_capacity' => max(0, (int) $this->max_capacity - (int) $this->current_occupancy),
                'type' => $this->type,
                'facility_type' => $this->facility_type,
                'allowed_hazards' => $this->allowed_hazards,
                'status' => $this->status,
                'activation_status' => $this->activation_status ?? 'open',
                'activation_trigger' => $this->activation_trigger,
                'cswd_mobilized' => (bool) $this->cswd_mobilized,
                'elevation_meters' => $this->elevation_meters !== null ? (int) $this->elevation_meters : null,
                'is_secured_facility' => (bool) $this->is_secured_facility,
                'emergency_contact' => $this->emergency_contact,
            ],
        ];
    }
}
