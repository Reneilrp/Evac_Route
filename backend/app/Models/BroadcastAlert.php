<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BroadcastAlert extends Model
{
    protected $fillable = [
        'title',
        'message',
        'severity',
        'scope',
        'barangay',
        'created_by'
    ];

    /**
     * Get the user who created/broadcasted the alert.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
