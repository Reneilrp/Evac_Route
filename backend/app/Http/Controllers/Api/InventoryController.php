<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\RationTemplateItem;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    /**
     * Get all inventory items.
     * Route: GET /api/inventory
     */
    public function getItems()
    {
        $items = InventoryItem::orderBy('item_name')->get();

        return response()->json([
            'status' => 'success',
            'data' => $items
        ], 200);
    }

    /**
     * Add a new item to the warehouse stock.
     * Route: POST /api/inventory
     */
    public function storeItem(Request $request)
    {
        $validated = $request->validate([
            'item_name' => 'required|string|max:255',
            'total_stock' => 'required|integer|min:0',
            'unit_type' => 'required|string|max:50',
        ]);

        $item = InventoryItem::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Inventory item added.',
            'data' => $item
        ], 201);
    }

    /**
     * Create the exact configuration (e.g., "Level 1 Flood Kit").
     * Route: POST /api/rations/template
     */
    public function storeTemplate(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'is_active' => 'boolean',
            'items' => 'required|array',
            'items.*.inventory_item_id' => 'required|exists:inventory_items,id',
            'items.*.quantity_per_head' => 'required|integer|min:1',
        ]);

        try {
            $template = DB::transaction(function () use ($validated) {
                // If this is set as active, we should probably deactivate others
                if ($validated['is_active'] ?? false) {
                    RationTemplate::query()->update(['is_active' => false]);
                }

                $template = RationTemplate::create([
                    'name' => $validated['name'],
                    'is_active' => $validated['is_active'] ?? false,
                ]);

                foreach ($validated['items'] as $item) {
                    RationTemplateItem::create([
                        'ration_template_id' => $template->id,
                        'inventory_item_id' => $item['inventory_item_id'],
                        'quantity_per_head' => $item['quantity_per_head'],
                    ]);
                }

                return $template->load('items.inventoryItem');
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Ration template created successfully.',
                'data' => $template
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Template creation failed: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create template. Please try again.'
            ], 400);
        }
    }

    /**
     * Adjust the warehouse stock of an item manually.
     * Route: PUT /api/inventory/{id}/adjust
     */
    public function adjustStock(Request $request, $id)
    {
        $validated = $request->validate([
            'total_stock' => 'required|integer|min:0',
        ]);

        $item = InventoryItem::findOrFail($id);
        $item->update(['total_stock' => $validated['total_stock']]);

        return response()->json([
            'status' => 'success',
            'message' => 'Stock adjusted successfully.',
            'data' => $item
        ], 200);
    }

    /**
     * Get all ration templates.
     * Route: GET /api/rations/templates
     */
    public function getTemplates()
    {
        $templates = RationTemplate::with('items.inventoryItem')
            ->orderBy('is_active', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $templates
        ], 200);
    }

    /**
     * Mark a specific ration template as active (and deactivate all others).
     * Route: PUT /api/rations/templates/{id}/active
     */
    public function activateTemplate(Request $request, $id)
    {
        $template = RationTemplate::findOrFail($id);

        try {
            DB::transaction(function () use ($template) {
                RationTemplate::query()->update(['is_active' => false]);
                $template->update(['is_active' => true]);
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Ration template activated.',
                'data' => $template->load('items.inventoryItem')
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Template activation failed: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to activate template. Please try again.'
            ], 400);
        }
    }
}
