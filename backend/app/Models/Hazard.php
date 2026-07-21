<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'latitude', 'longitude', 'location', 'radius_meters', 'estimated_duration_hours', 'is_active', 'reported_by', 'hazard_type', 'severity_level', 'is_fixed_flood_spot', 'disaster_category'])]
class Hazard extends Model
{
    protected $hidden = ['location'];

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
}
