<?php

namespace App\Http\Controllers\Api;

use App\Events\HazardCreated;
use App\Http\Controllers\Controller;
use App\Models\Hazard;
use App\Models\RoadEdge;
use App\Models\RoadNode;
use Illuminate\Http\Request;

class RoadNetworkController extends Controller
{
    /**
     * Mobile app pulls the full road graph for offline SQLite sync.
     * Route: GET /api/road-network  (public or auth:sanctum)
     */
    public function index()
    {
        $nodes = RoadNode::all(['id', 'lat', 'lng', 'label', 'elevation_meters']);
        $edges = RoadEdge::all([
            'id', 'source_node_id', 'target_node_id', 'distance_meters', 'geometry', 
            'status', 'block_reason', 'slope_degrees', 'flood_susceptibility', 
            'landslide_susceptibility', 'min_elevation_meters'
        ]);

        return response()->json([
            'status' => 'success',
            'nodes'  => $nodes,
            'edges'  => $edges,
        ]);
    }

    /**
     * LGU marks a road segment as blocked/danger/open.
     * Route: PUT /api/road-network/edges/{id}/status  (role:admin,lgu_staff)
     */
    public function updateEdgeStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status'       => 'required|in:open,blocked,danger',
            'block_reason' => 'nullable|string|max:255',
        ]);

        $edge = RoadEdge::findOrFail($id);
        $edge->update($validated);

        // Fire a broadcast if blocking/danger, so mobile clients know immediately
        if ($validated['status'] !== 'open') {
            $node = RoadNode::find($edge->source_node_id);
            if ($node) {
                $syntheticHazard = new Hazard();
                $syntheticHazard->id = 0;
                $syntheticHazard->name = $validated['block_reason'] ?? 'Road Blocked by LGU';
                $syntheticHazard->latitude = $node->lat;
                $syntheticHazard->longitude = $node->lng;
                $syntheticHazard->radius_meters = 30;
                $syntheticHazard->hazard_type = 'maintenance';
                $syntheticHazard->severity_level = 'high';
                $syntheticHazard->is_active = true;
                broadcast(new HazardCreated($syntheticHazard));
            }
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Road segment status updated.',
            'data'    => $edge,
        ]);
    }
}
