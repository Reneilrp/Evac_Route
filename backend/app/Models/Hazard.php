<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['name', 'latitude', 'longitude', 'radius_meters', 'is_active', 'reported_by', 'hazard_type', 'severity_level'])]
class Hazard extends Model
{
    public function reportedBy()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
