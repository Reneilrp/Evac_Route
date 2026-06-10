<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'latitude', 'longitude', 'max_capacity', 'current_occupancy', 'status', 'pinned_by'])]
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
