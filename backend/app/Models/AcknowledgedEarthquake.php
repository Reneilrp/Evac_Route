<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcknowledgedEarthquake extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'usgs_id',
        'acknowledged_by',
        'acknowledged_at',
    ];
}
