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

    protected $appends = [
        'category',
        'item_name',
        'quantity',
        'estimated_servings',
        'unit',
    ];

    public function getCategoryAttribute(): ?string
    {
        return $this->item_category;
    }

    public function getItemNameAttribute(): ?string
    {
        return $this->item_description;
    }

    public function getQuantityAttribute(): int
    {
        return (int) $this->quantity_servings;
    }

    public function getEstimatedServingsAttribute(): int
    {
        return (int) $this->quantity_servings;
    }

    public function getUnitAttribute(): string
    {
        return match ($this->item_category) {
            'hot_meals' => 'servings',
            'bottled_water' => 'bottles',
            'bread_pastry' => 'packs',
            'canned_goods' => 'cans',
            'hygiene_kits' => 'kits',
            'clothing' => 'pieces',
            default => 'units',
        };
    }

    public function shelter()
    {
        return $this->belongsTo(Shelter::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
