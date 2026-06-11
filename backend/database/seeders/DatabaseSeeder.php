<?php

namespace Database\Seeders;

use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\RationTemplateItem;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Admins & LGU Staff
        $admin = User::create([
            'name' => 'Admin Account',
            'email' => 'drrm@lgu.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $staff1 = User::create([
            'name' => 'Shelter Scanner 1',
            'email' => 'scanner1@lgu.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'status' => 'active',
        ]);

        $staff2 = User::create([
            'name' => 'Warehouse Mgr',
            'email' => 'warehouse@lgu.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'status' => 'inactive',
        ]);

        // 2. Create Shelters (in Zamboanga City area coords)
        $shelter1 = Shelter::create([
            'name' => 'Tetuan Covered Court',
            'latitude' => 6.9185,
            'longitude' => 122.0882,
            'max_capacity' => 150,
            'current_occupancy' => 45,
            'status' => 'open',
            'pinned_by' => $admin->id,
        ]);

        $shelter2 = Shelter::create([
            'name' => 'Baliwasan Gym',
            'latitude' => 6.9126,
            'longitude' => 122.0573,
            'max_capacity' => 200,
            'current_occupancy' => 18,
            'status' => 'open',
            'pinned_by' => $admin->id,
        ]);

        $shelter3 = Shelter::create([
            'name' => 'Tugbungan Elementary School',
            'latitude' => 6.9312,
            'longitude' => 122.0954,
            'max_capacity' => 100,
            'current_occupancy' => 0,
            'status' => 'closed',
            'pinned_by' => $admin->id,
        ]);

        // 3. Create Warehouse Stock Inventory
        $rice = InventoryItem::create([
            'item_name' => 'Rice (25kg sack)',
            'total_stock' => 1200,
            'unit_type' => 'sacks',
        ]);

        $water = InventoryItem::create([
            'item_name' => 'Bottled Water (1L)',
            'total_stock' => 3500,
            'unit_type' => 'pcs',
        ]);

        $canned = InventoryItem::create([
            'item_name' => 'Canned Sardines',
            'total_stock' => 150, // Low stock boundary test (<200)
            'unit_type' => 'pcs',
        ]);

        $blanket = InventoryItem::create([
            'item_name' => 'Warm Blankets',
            'total_stock' => 800,
            'unit_type' => 'pcs',
        ]);

        // 4. Create Ration Template
        $template = RationTemplate::create([
            'name' => 'Standard Disaster Relief Pack',
            'is_active' => true,
        ]);

        RationTemplateItem::create([
            'ration_template_id' => $template->id,
            'inventory_item_id' => $rice->id,
            'quantity_per_head' => 1,
        ]);

        RationTemplateItem::create([
            'ration_template_id' => $template->id,
            'inventory_item_id' => $water->id,
            'quantity_per_head' => 2,
        ]);

        RationTemplateItem::create([
            'ration_template_id' => $template->id,
            'inventory_item_id' => $blanket->id,
            'quantity_per_head' => 1,
        ]);

        // 5. Create Family Residents & Profiles
        $names = ['Cruz Family', 'Santos Family', 'Flores Family', 'Reyes Family', 'Gonzales Family'];
        $headcounts = [4, 6, 3, 5, 2];
        $baranguays = ['Tetuan', 'Baliwasan', 'Tugbungan', 'San Jose', 'Santa Maria'];

        $families = [];
        for ($i = 0; $i < 5; $i++) {
            $user = User::create([
                'name' => $names[$i],
                'email' => "resident_{$i}@evacroute.local",
                'password' => bcrypt('password'),
                'role' => 'resident',
            ]);

            $families[] = FamilyProfile::create([
                'user_id' => $user->id,
                'headcount' => $headcounts[$i],
                'contact_number' => '0912345678'.$i,
                'barangay' => $baranguays[$i],
                'qr_code_hash' => 'hash_test_code_'.$i,
            ]);
        }

        // 6. Create Evacuation Logs (Check-ins & historical check-outs)
        // Log 1: Santos Checked in & out from Baliwasan (Santos headcount=6)
        EvacuationLog::create([
            'family_profile_id' => $families[1]->id,
            'shelter_id' => $shelter2->id,
            'checked_in_at' => now()->subHours(6),
            'checked_out_at' => now()->subHours(2),
            'recorded_headcount' => 6,
            'ration_claimed' => true,
        ]);

        // Log 2: Cruz Checked in to Tetuan ( Cruz headcount=4)
        EvacuationLog::create([
            'family_profile_id' => $families[0]->id,
            'shelter_id' => $shelter1->id,
            'checked_in_at' => now()->subHours(3),
            'recorded_headcount' => 4,
            'ration_claimed' => true,
        ]);

        // Log 3: Reyes Checked in to Tetuan (Reyes headcount=5)
        EvacuationLog::create([
            'family_profile_id' => $families[3]->id,
            'shelter_id' => $shelter1->id,
            'checked_in_at' => now()->subMinutes(45),
            'recorded_headcount' => 5,
            'ration_claimed' => true,
        ]);

        // 7. Seed Road Nodes
        $nodes = [
            ['id' => 1, 'lat' => 6.9150, 'lng' => 122.0850, 'label' => 'User Home 1 (Tetuan residential)'],
            ['id' => 2, 'lat' => 6.9170, 'lng' => 122.0850, 'label' => 'Intersection A (Tetuan Main Rd)'],
            ['id' => 3, 'lat' => 6.9185, 'lng' => 122.0882, 'label' => 'Shelter 1 (Tetuan Covered Court)'],
            ['id' => 4, 'lat' => 6.9250, 'lng' => 122.0900, 'label' => 'Intersection C (Tugbungan Road)'],
            ['id' => 5, 'lat' => 6.9312, 'lng' => 122.0954, 'label' => 'Shelter 3 (Tugbungan Elementary School)'],
            ['id' => 6, 'lat' => 6.9120, 'lng' => 122.0650, 'label' => 'Intersection D (Baliwasan crossroads)'],
            ['id' => 7, 'lat' => 6.9126, 'lng' => 122.0573, 'label' => 'Shelter 2 (Baliwasan Gym)'],
            ['id' => 8, 'lat' => 6.9170, 'lng' => 122.0870, 'label' => 'Intermediary road node near hazard'],
            ['id' => 9, 'lat' => 6.9160, 'lng' => 122.0890, 'label' => 'Alternative bypass route node'],
        ];

        foreach ($nodes as $node) {
            \App\Models\RoadNode::create($node);
        }

        // 8. Seed Road Edges (bi-directional as per offline mobile graph logic)
        $edges = [
            ['source_node_id' => 1, 'target_node_id' => 2, 'distance_meters' => 220.00, 'geometry' => [[122.0850, 6.9150], [122.0850, 6.9170]]],
            ['source_node_id' => 2, 'target_node_id' => 8, 'distance_meters' => 220.00, 'geometry' => [[122.0850, 6.9170], [122.0870, 6.9170]]],
            ['source_node_id' => 8, 'target_node_id' => 3, 'distance_meters' => 200.00, 'geometry' => [[122.0870, 6.9170], [122.0882, 6.9185]]],
            ['source_node_id' => 1, 'target_node_id' => 9, 'distance_meters' => 450.00, 'geometry' => [[122.0850, 6.9150], [122.0870, 6.9155], [122.0890, 6.9160]]],
            ['source_node_id' => 9, 'target_node_id' => 3, 'distance_meters' => 280.00, 'geometry' => [[122.0890, 6.9160], [122.0882, 6.9185]]],
            ['source_node_id' => 2, 'target_node_id' => 4, 'distance_meters' => 1000.00, 'geometry' => [[122.0850, 6.9170], [122.0880, 6.9210], [122.0900, 6.9250]]],
            ['source_node_id' => 4, 'target_node_id' => 5, 'distance_meters' => 900.00, 'geometry' => [[122.0900, 6.9250], [122.0920, 6.9280], [122.0954, 6.9312]]],
            ['source_node_id' => 1, 'target_node_id' => 6, 'distance_meters' => 2200.00, 'geometry' => [[122.0850, 6.9150], [122.0750, 6.9130], [122.0650, 6.9120]]],
            ['source_node_id' => 6, 'target_node_id' => 7, 'distance_meters' => 800.00, 'geometry' => [[122.0650, 6.9120], [122.0600, 6.9123], [122.0573, 6.9126]]],
        ];

        foreach ($edges as $edge) {
            // Forward edge
            \App\Models\RoadEdge::create([
                'source_node_id' => $edge['source_node_id'],
                'target_node_id' => $edge['target_node_id'],
                'distance_meters' => $edge['distance_meters'],
                'geometry' => $edge['geometry'],
                'status' => 'open',
            ]);
            // Reverse edge
            \App\Models\RoadEdge::create([
                'source_node_id' => $edge['target_node_id'],
                'target_node_id' => $edge['source_node_id'],
                'distance_meters' => $edge['distance_meters'],
                'geometry' => array_reverse($edge['geometry']),
                'status' => 'open',
            ]);
        }
    }
}
