<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['name', 'is_active'])]
class RationTemplate extends Model
{
    public function items()
    {
        return $this->hasMany(RationTemplateItem::class);
    }
}
