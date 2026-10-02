<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RescueMission extends Model
{
    use HasFactory;

    protected $fillable = [
        'control_no',
        'pending_incident_id',
        'rescue_unit_id',
        'dispatched_by',
        'status',
        'triage_level',
        'victim_name',
        'victim_phone',
        'victim_latitude',
        'victim_longitude',
        'barangay',
        'headcount',
        'special_needs',
        'situation_description',
        'target_shelter_id',
        'staging_point_id',
        'dispatched_at',
        'arrived_at',
        'completed_at',
        'notes',
    ];

    protected $casts = [
        'victim_latitude' => 'float',
        'victim_longitude' => 'float',
        'headcount' => 'integer',
        'dispatched_at' => 'datetime',
        'arrived_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function incident()
    {
        return $this->belongsTo(PendingIncident::class, 'pending_incident_id');
    }

    public function rescueUnit()
    {
        return $this->belongsTo(RescueUnit::class, 'rescue_unit_id');
    }

    public function dispatcher()
    {
        return $this->belongsTo(User::class, 'dispatched_by');
    }

    public function targetShelter()
    {
        return $this->belongsTo(Shelter::class, 'target_shelter_id');
    }

    public function stagingPoint()
    {
        return $this->belongsTo(Shelter::class, 'staging_point_id');
    }
}
