<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoadNode extends Model
{
    protected $fillable = ['lat', 'lng', 'label'];

    public function outgoingEdges()
    {
        return $this->hasMany(RoadEdge::class, 'source_node_id');
    }
}
