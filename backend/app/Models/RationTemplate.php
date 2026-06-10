<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'is_active'])]
class RationTemplate extends Model
{
    public function items()
    {
        return $this->hasMany(RationTemplateItem::class);
    }
}
