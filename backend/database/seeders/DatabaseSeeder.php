<?php

namespace Database\Seeders;

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
            'status' => 'active'
        ]);

        $staff1 = User::create([
            'name' => 'Shelter Scanner 1',
            'email' => 'scanner1@lgu.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'status' => 'active'
        ]);

        $staff2 = User::create([
            'name' => 'Warehouse Mgr',
            'email' => 'warehouse@lgu.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'status' => 'inactive'
        ]);

        // 2. Create Shelters (in Zamboanga City area coords)
        $shelter1 = \App\Models\Shelter::create([
            'name' => 'Tetuan Covered Court',
            'latitude' => 6.9185,
            'longitude' => 122.0882,
            'max_capacity' => 150,
            'current_occupancy' => 45,
            'status' => 'open',
            'pinned_by' => $admin->id
        ]);

        $shelter2 = \App\Models\Shelter::create([
            'name' => 'Baliwasan Gym',
            'latitude' => 6.9126,
            'longitude' => 122.0573,
            'max_capacity' => 200,
            'current_occupancy' => 18,
            'status' => 'open',
            'pinned_by' => $admin->id
        ]);

        $shelter3 = \App\Models\Shelter::create([
            'name' => 'Tugbungan Elementary School',
            'latitude' => 6.9312,
            'longitude' => 122.0954,
            'max_capacity' => 100,
            'current_occupancy' => 0,
            'status' => 'closed',
            'pinned_by' => $admin->id
        ]);

        // 3. Create Warehouse Stock Inventory
        $rice = \App\Models\InventoryItem::create([
            'item_name' => 'Rice (25kg sack)',
            'total_stock' => 1200,
            'unit_type' => 'sacks'
        ]);

        $water = \App\Models\InventoryItem::create([
            'item_name' => 'Bottled Water (1L)',
            'total_stock' => 3500,
            'unit_type' => 'pcs'
        ]);

        $canned = \App\Models\InventoryItem::create([
            'item_name' => 'Canned Sardines',
            'total_stock' => 150, // Low stock boundary test (<200)
            'unit_type' => 'pcs'
        ]);

        $blanket = \App\Models\InventoryItem::create([
            'item_name' => 'Warm Blankets',
            'total_stock' => 800,
            'unit_type' => 'pcs'
        ]);

        // 4. Create Ration Template
        $template = \App\Models\RationTemplate::create([
            'name' => 'Standard Disaster Relief Pack',
            'is_active' => true
        ]);

        \App\Models\RationTemplateItem::create([
            'ration_template_id' => $template->id,
            'inventory_item_id' => $rice->id,
            'quantity_per_head' => 1
        ]);

        \App\Models\RationTemplateItem::create([
            'ration_template_id' => $template->id,
            'inventory_item_id' => $water->id,
            'quantity_per_head' => 2
        ]);

        \App\Models\RationTemplateItem::create([
            'ration_template_id' => $template->id,
            'inventory_item_id' => $blanket->id,
            'quantity_per_head' => 1
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
                'role' => 'resident'
            ]);

            $families[] = \App\Models\FamilyProfile::create([
                'user_id' => $user->id,
                'headcount' => $headcounts[$i],
                'contact_number' => '0912345678' . $i,
                'barangay' => $baranguays[$i],
                'qr_code_hash' => 'hash_test_code_' . $i
            ]);
        }

        // 6. Create Evacuation Logs (Check-ins & historical check-outs)
        // Log 1: Santos Checked in & out from Baliwasan (Santos headcount=6)
        \App\Models\EvacuationLog::create([
            'family_profile_id' => $families[1]->id,
            'shelter_id' => $shelter2->id,
            'checked_in_at' => now()->subHours(6),
            'checked_out_at' => now()->subHours(2),
            'recorded_headcount' => 6,
            'ration_claimed' => true
        ]);

        // Log 2: Cruz Checked in to Tetuan ( Cruz headcount=4)
        \App\Models\EvacuationLog::create([
            'family_profile_id' => $families[0]->id,
            'shelter_id' => $shelter1->id,
            'checked_in_at' => now()->subHours(3),
            'recorded_headcount' => 4,
            'ration_claimed' => true
        ]);

        // Log 3: Reyes Checked in to Tetuan (Reyes headcount=5)
        \App\Models\EvacuationLog::create([
            'family_profile_id' => $families[3]->id,
            'shelter_id' => $shelter1->id,
            'checked_in_at' => now()->subMinutes(45),
            'recorded_headcount' => 5,
            'ration_claimed' => true
        ]);
    }
}
