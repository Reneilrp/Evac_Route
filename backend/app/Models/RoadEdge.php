<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoadEdge extends Model
{
    protected $fillable = [
        'source_node_id', 'target_node_id', 'distance_meters',
        'geometry', 'status', 'block_reason',
    ];

    protected $casts = [
        'geometry' => 'array',
    ];

    public function sourceNode()
    {
        return $this->belongsTo(RoadNode::class, 'source_node_id');
    }

    public function targetNode()
    {
        return $this->belongsTo(RoadNode::class, 'target_node_id');
    }
}
