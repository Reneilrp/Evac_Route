<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'operator_type', 'assigned_rescue_unit_id', 'assigned_shelter_id', 'rescue_role', 'status', 'push_token', 'last_latitude', 'last_longitude', 'alert_radius_meters'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public function familyProfile()
    {
        return $this->hasOne(FamilyProfile::class);
    }

    public function assignedRescueUnit()
    {
        return $this->belongsTo(RescueUnit::class, 'assigned_rescue_unit_id');
    }

    public function assignedShelter()
    {
        return $this->belongsTo(Shelter::class, 'assigned_shelter_id');
    }

    public function rescueUnits()
    {
        return $this->hasMany(RescueUnit::class, 'assigned_personnel_id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
