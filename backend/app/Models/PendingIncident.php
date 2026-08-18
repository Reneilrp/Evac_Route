<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingIncident extends Model
{
    protected $fillable = [
        'reported_by', 'name', 'latitude', 'longitude',
        'hazard_type', 'severity_level', 'description',
        'photo_path', 'photos', 'status', 'read_at', 'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'read_at' => 'datetime',
        'photos' => 'array',
    ];

    protected $appends = ['is_read'];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Check if the incident has been read/opened by LGU officials.
     */
    public function getIsReadAttribute(): bool
    {
        return $this->read_at !== null || $this->reviewed_at !== null || $this->status !== 'pending';
    }

    /**
     * Get array of public URLs for all incident photos (up to 3).
     */
    public function getPhotoUrlsAttribute(): array
    {
        $urls = [];

        if (! empty($this->photos) && is_array($this->photos)) {
            foreach ($this->photos as $path) {
                if ($path) {
                    $urls[] = url('storage/'.$path);
                }
            }
        } elseif ($this->photo_path) {
            $urls[] = url('storage/'.$this->photo_path);
        }

        return $urls;
    }

    /**
     * Get the primary public URL for the incident photo.
     */
    public function getPhotoUrlAttribute(): ?string
    {
        $urls = $this->photo_urls;

        return $urls[0] ?? null;
    }
}
