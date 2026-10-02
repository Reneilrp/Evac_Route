<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RescueUnit extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'call_sign',
        'unit_type',
        'status',
        'current_latitude',
        'current_longitude',
        'assigned_personnel_id',
        'contact_number',
        'capacity_persons',
    ];

    protected $casts = [
        'current_latitude' => 'float',
        'current_longitude' => 'float',
        'capacity_persons' => 'integer',
    ];

    public function assignedPersonnel()
    {
        return $this->belongsTo(User::class, 'assigned_personnel_id');
    }

    public function crewMembers()
    {
        return $this->hasMany(User::class, 'assigned_rescue_unit_id');
    }

    public function missions()
    {
        return $this->hasMany(RescueMission::class);
    }

    public function activeMission()
    {
        return $this->hasOne(RescueMission::class)
            ->whereIn('status', ['dispatched', 'en_route', 'on_scene', 'transporting'])
            ->latestOfMany();
    }
}
