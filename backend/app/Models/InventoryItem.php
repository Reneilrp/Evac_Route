<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['item_name', 'total_stock', 'unit_type'])]
class InventoryItem extends Model
{
    public function rationTemplateItems()
    {
        return $this->hasMany(RationTemplateItem::class);
    }
}
