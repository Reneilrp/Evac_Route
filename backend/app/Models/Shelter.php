<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'latitude', 'longitude', 'max_capacity', 'current_occupancy', 'status', 'pinned_by', 'facility_type', 'is_secured_facility', 'emergency_contact', 'elevation_meters', 'amenities', 'transport_schedule', 'barangay'])]
class Shelter extends Model
{
    public function pinnedBy()
    {
        return $this->belongsTo(User::class, 'pinned_by');
    }

    public function evacuationLogs()
    {
        return $this->hasMany(EvacuationLog::class);
    }
}
