<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['family_profile_id', 'shelter_id', 'checked_in_at', 'checked_out_at', 'recorded_headcount', 'ration_claimed'])]
class EvacuationLog extends Model
{
    protected $casts = [
        'checked_in_at' => 'datetime',
        'checked_out_at' => 'datetime',
        'ration_claimed' => 'boolean',
    ];

    public function familyProfile()
    {
        return $this->belongsTo(FamilyProfile::class);
    }

    public function shelter()
    {
        return $this->belongsTo(Shelter::class);
    }
}
