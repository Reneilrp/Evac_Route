<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShelterDonation extends Model
{
    use HasFactory;

    protected $fillable = [
        'shelter_id',
        'donor_name',
        'item_category',
        'item_description',
        'quantity_servings',
        'distribution_mode',
        'recorded_by',
        'notes',
    ];

    protected $casts = [
        'quantity_servings' => 'integer',
    ];

    public function shelter()
    {
        return $this->belongsTo(Shelter::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
