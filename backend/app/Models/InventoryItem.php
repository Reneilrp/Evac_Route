<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['item_name', 'total_stock', 'reserved_quantity', 'unit_type'])]
class InventoryItem extends Model
{
    protected $appends = ['available_stock'];

    public function getAvailableStockAttribute(): int
    {
        return max(0, (int) $this->total_stock - (int) ($this->reserved_quantity ?? 0));
    }

    public function rationTemplateItems()
    {
        return $this->hasMany(RationTemplateItem::class);
    }
}
