<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['ration_template_id', 'inventory_item_id', 'quantity_per_head'])]
class RationTemplateItem extends Model
{
    public function template()
    {
        return $this->belongsTo(RationTemplate::class, 'ration_template_id');
    }

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class);
    }
}
