<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'latitude', 'longitude', 'location', 'radius_meters', 'is_active', 'reported_by', 'hazard_type', 'severity_level'])]
class Hazard extends Model
{
    protected static function boot()
    {
        parent::boot();

        // Automatically sync the POINT column for R-tree spatial indexing
        static::saving(function ($hazard) {
            if (\DB::getDriverName() !== 'sqlite' && $hazard->latitude && $hazard->longitude) {
                // For MySQL/MariaDB: POINT(longitude, latitude)
                $hazard->location = \DB::raw("ST_GeomFromText('POINT({$hazard->longitude} {$hazard->latitude})')");
            }
        });
    }

    public function reportedBy()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
