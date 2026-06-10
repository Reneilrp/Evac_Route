<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingIncident extends Model
{
    protected $fillable = [
        'reported_by', 'name', 'latitude', 'longitude',
        'hazard_type', 'severity_level', 'description',
        'photo_path', 'status', 'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Get the public URL for the incident photo.
     */
    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path
            ? url('storage/' . $this->photo_path)
            : null;
    }
}
