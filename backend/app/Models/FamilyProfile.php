<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'headcount', 'contact_number', 'barangay', 'qr_code_hash', 'transportation_mode'])]
class FamilyProfile extends Model
{
    protected $appends = ['name'];

    public function getNameAttribute()
    {
        return $this->user?->name;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function evacuationLogs()
    {
        return $this->hasMany(EvacuationLog::class);
    }
}
