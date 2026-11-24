<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'family_profile_id',
    'shelter_id',
    'checked_in_at',
    'checked_out_at',
    'archived_at',
    'recorded_headcount',
    'actual_headcount',
    'is_temporary_offsite',
    'temporary_offsite_at',
    'walk_in_voucher',
    'vulnerabilities',
    'ration_claimed',
    'checkin_method',
    'checkin_latitude',
    'checkin_longitude',
])]
class EvacuationLog extends Model
{
    protected $casts = [
        'checked_in_at' => 'datetime',
        'checked_out_at' => 'datetime',
        'archived_at' => 'datetime',
        'temporary_offsite_at' => 'datetime',
        'is_temporary_offsite' => 'boolean',
        'ration_claimed' => 'boolean',
        'claimed_ration_items' => 'array',
        'vulnerabilities' => 'array',
        'actual_headcount' => 'integer',
        'recorded_headcount' => 'integer',
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
