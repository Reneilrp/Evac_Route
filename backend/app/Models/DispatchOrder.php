<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'created_by', 'assigned_to', 'shelter_id',
    'status', 'notes', 'departed_at', 'delivered_at',
])]
class DispatchOrder extends Model
{
    protected $casts = [
        'departed_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function shelter(): BelongsTo
    {
        return $this->belongsTo(Shelter::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DispatchOrderItem::class);
    }
}
