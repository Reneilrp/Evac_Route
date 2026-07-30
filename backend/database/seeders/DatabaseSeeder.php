<?php

namespace Database\Seeders;

use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\Hazard;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\RationTemplateItem;
use App\Models\RoadEdge;
use App\Models\RoadNode;
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
        $admin = User::firstOrCreate(['email' => 'drrm@lgu.gov.ph'], [
            'name' => 'Admin Account',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $staff1 = User::firstOrCreate(['email' => 'scanner1@lgu.gov.ph'], [
            'name' => 'Shelter Scanner 1',
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
            'elevation_meters' => 12,
            'amenities' => 'Overnight Beds, Drinking Water, Medical Station, Rations Desk',
            'barangay' => 'Tetuan',
            'max_capacity' => 150,
            'current_occupancy' => 45,
            'status' => 'open',
            'facility_type' => 'evacuation_center',
            'pinned_by' => $admin->id,
        ]);

        $shelter2 = Shelter::create([
            'name' => 'Baliwasan Gym',
            'latitude' => 6.9126,
            'longitude' => 122.0573,
            'elevation_meters' => 8,
            'amenities' => 'Overnight Beds, Food Rations, First Aid',
            'barangay' => 'Baliwasan',
            'max_capacity' => 200,
            'current_occupancy' => 18,
            'status' => 'open',
            'facility_type' => 'evacuation_center',
            'pinned_by' => $admin->id,
        ]);

        $shelter3 = Shelter::create([
            'name' => 'Tugbungan Elementary School',
            'latitude' => 6.9312,
            'longitude' => 122.0954,
            'elevation_meters' => 15,
            'amenities' => 'Classroom Beds, Water Tanks',
            'barangay' => 'Tugbungan',
            'max_capacity' => 100,
            'current_occupancy' => 0,
            'status' => 'closed',
            'facility_type' => 'evacuation_center',
            'pinned_by' => $admin->id,
        ]);

        // 2b. Create Law Enforcement, Military, Hospital & Fire Station Facilities (REV-02 & REV-03)
        $police = Shelter::create([
            'name' => 'Zamboanga Police Station 11 (Central HQ)',
            'latitude' => 6.9155,
            'longitude' => 122.0790,
            'elevation_meters' => 14,
            'amenities' => 'Armed Security, Ballistic Armor, Emergency Dispatch',
            'barangay' => 'Zone 3',
            'max_capacity' => 200,
            'current_occupancy' => 12,
            'status' => 'open',
            'facility_type' => 'police_station',
            'is_secured_facility' => true,
            'emergency_contact' => '0917-POLICE-911',
            'pinned_by' => $admin->id,
        ]);

        $military = Shelter::create([
            'name' => 'WESTMINCOM Military Command Outpost',
            'latitude' => 6.9240,
            'longitude' => 122.0620,
            'elevation_meters' => 18,
            'amenities' => 'Heavy Armed Guards, Fortified Bunker, Helicopter Pad',
            'barangay' => 'Canelar',
            'max_capacity' => 500,
            'current_occupancy' => 40,
            'status' => 'open',
            'facility_type' => 'military_base',
            'is_secured_facility' => true,
            'emergency_contact' => '0917-MILITARY-01',
            'pinned_by' => $admin->id,
        ]);

        $hospital = Shelter::create([
            'name' => 'Zamboanga City Medical Center (ZCMC)',
            'latitude' => 6.9210,
            'longitude' => 122.0750,
            'elevation_meters' => 16,
            'amenities' => 'ICU Trauma Center, Decontamination Unit, Emergency Ward',
            'barangay' => 'Zone 4',
            'max_capacity' => 300,
            'current_occupancy' => 180,
            'status' => 'open',
            'facility_type' => 'hospital',
            'is_secured_facility' => false,
            'emergency_contact' => '0917-ZCMC-999',
            'pinned_by' => $admin->id,
        ]);

        $fireStation = Shelter::create([
            'name' => 'Central Fire Station & Rescue Depot',
            'latitude' => 6.9140,
            'longitude' => 122.0810,
            'elevation_meters' => 12,
            'amenities' => 'Search & Rescue Truck, Chemical Hose Decontam',
            'barangay' => 'Zone 1',
            'max_capacity' => 150,
            'current_occupancy' => 5,
            'status' => 'open',
            'facility_type' => 'fire_station',
            'is_secured_facility' => false,
            'emergency_contact' => '0917-FIRE-160',
            'pinned_by' => $admin->id,
        ]);

        // Explicit Safe Zones (REV-03)
        $safeZone1 = Shelter::create([
            'name' => 'Pasonanca Park High-Ground Safe Zone',
            'latitude' => 6.9450,
            'longitude' => 122.0700,
            'elevation_meters' => 45,
            'amenities' => 'High Ground Elevation (45m), Open Air Field, Fresh Water Springs',
            'barangay' => 'Pasonanca',
            'max_capacity' => 1000,
            'current_occupancy' => 0,
            'status' => 'open',
            'facility_type' => 'safe_zone',
            'is_secured_facility' => false,
            'pinned_by' => $admin->id,
        ]);

        $safeZone2 = Shelter::create([
            'name' => 'Tetuan Elevated Ridge Open Field',
            'latitude' => 6.9195,
            'longitude' => 122.0895,
            'elevation_meters' => 22,
            'amenities' => 'Flood Safe Elevation (22m), Solar Lighting, First Aid Tent',
            'barangay' => 'Tetuan',
            'max_capacity' => 400,
            'current_occupancy' => 0,
            'status' => 'open',
            'facility_type' => 'safe_zone',
            'is_secured_facility' => false,
            'pinned_by' => $admin->id,
        ]);

        // Explicit Assembly Points (REV-03)
        $assembly1 = Shelter::create([
            'name' => 'Barangay Tetuan Hall Pick-up Assembly Point',
            'latitude' => 6.9165,
            'longitude' => 122.0840,
            'elevation_meters' => 11,
            'transport_schedule' => 'LGU Evacuation Bus pick-up every 15 mins',
            'amenities' => 'LGU Transport Desk, Drinking Water, First Aid',
            'barangay' => 'Tetuan',
            'max_capacity' => 250,
            'current_occupancy' => 15,
            'status' => 'open',
            'facility_type' => 'assembly_point',
            'is_secured_facility' => false,
            'pinned_by' => $admin->id,
        ]);

        $assembly2 = Shelter::create([
            'name' => 'Guiwan Staging & Pick-up Assembly Point',
            'latitude' => 6.9260,
            'longitude' => 122.0910,
            'elevation_meters' => 14,
            'transport_schedule' => 'Military/LGU Truck pickup every 20 mins',
            'amenities' => 'LGU Bus Stop, Quick Water Station',
            'barangay' => 'Guiwan',
            'max_capacity' => 300,
            'current_occupancy' => 0,
            'status' => 'open',
            'facility_type' => 'assembly_point',
            'is_secured_facility' => false,
            'pinned_by' => $admin->id,
        ]);

        // Seed Disaster Test Simulation Hazards (Toggleable ON/OFF - REV-07)
        // 1. Armed Siege Hazards (Tumaga & Tetuan)
        Hazard::create([
            'name' => 'Tumaga Active Conflict & Armed Siege Zone',
            'latitude' => 6.9410,
            'longitude' => 122.0780,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9410 122.0780)', 4326)") : null,
            'radius_meters' => 500,
            'estimated_duration_hours' => 24,
            'is_active' => false,
            'disaster_category' => 'man_made',
            'hazard_type' => 'siege',
            'severity_level' => 'high',
            'reported_by' => $admin->id,
        ]);

        Hazard::create([
            'name' => 'Tetuan Armed Siege & Crossfire Zone',
            'latitude' => 6.9160,
            'longitude' => 122.0860,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9160 122.0860)', 4326)") : null,
            'radius_meters' => 450,
            'estimated_duration_hours' => 24,
            'is_active' => false,
            'disaster_category' => 'man_made',
            'hazard_type' => 'siege',
            'severity_level' => 'high',
            'reported_by' => $admin->id,
        ]);

        // 2. Flood Simulation Hazards (River Basins & Lowlands)
        Hazard::create([
            'name' => 'San Jose Gusu High-Water Flood & Inundation Zone',
            'latitude' => 6.9230,
            'longitude' => 122.0450,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9230 122.0450)', 4326)") : null,
            'radius_meters' => 450,
            'estimated_duration_hours' => 18,
            'is_active' => false,
            'disaster_category' => 'natural',
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'reported_by' => $admin->id,
        ]);

        Hazard::create([
            'name' => 'Tumaga River Overflow & Inundation Hazard Zone',
            'latitude' => 6.9380,
            'longitude' => 122.0740,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9380 122.0740)', 4326)") : null,
            'radius_meters' => 400,
            'estimated_duration_hours' => 24,
            'is_active' => false,
            'disaster_category' => 'natural',
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'reported_by' => $admin->id,
        ]);

        Hazard::create([
            'name' => 'Tetuan - Tugbungan Riverway Spill & Flood Zone',
            'latitude' => 6.9200,
            'longitude' => 122.0910,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9200 122.0910)', 4326)") : null,
            'radius_meters' => 350,
            'estimated_duration_hours' => 18,
            'is_active' => false,
            'disaster_category' => 'natural',
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'reported_by' => $admin->id,
        ]);

        Hazard::create([
            'name' => 'Saac - Talon-Talon River Flood Basin',
            'latitude' => 6.9040,
            'longitude' => 122.1030,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9040 122.1030)', 4326)") : null,
            'radius_meters' => 300,
            'estimated_duration_hours' => 12,
            'is_active' => false,
            'disaster_category' => 'natural',
            'hazard_type' => 'flood',
            'severity_level' => 'medium',
            'reported_by' => $admin->id,
        ]);

        Hazard::create([
            'name' => 'Manicahan River Overflow Zone',
            'latitude' => 6.9850,
            'longitude' => 122.1800,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9850 122.1800)', 4326)") : null,
            'radius_meters' => 450,
            'estimated_duration_hours' => 24,
            'is_active' => false,
            'disaster_category' => 'natural',
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'reported_by' => $admin->id,
        ]);

        Hazard::create([
            'name' => 'Labuan River Basin Inundation Zone',
            'latitude' => 7.0850,
            'longitude' => 121.9050,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(7.0850 121.9050)', 4326)") : null,
            'radius_meters' => 350,
            'estimated_duration_hours' => 18,
            'is_active' => false,
            'disaster_category' => 'natural',
            'hazard_type' => 'flood',
            'severity_level' => 'medium',
            'reported_by' => $admin->id,
        ]);

        Hazard::create([
            'name' => 'Ayala River Overflow & High-Water Zone',
            'latitude' => 6.9600,
            'longitude' => 121.9500,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9600 121.9500)', 4326)") : null,
            'radius_meters' => 400,
            'estimated_duration_hours' => 24,
            'is_active' => false,
            'disaster_category' => 'natural',
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'reported_by' => $admin->id,
        ]);

        // 3. Fire Simulation Hazard (Baliwasan Market)
        Hazard::create([
            'name' => 'Baliwasan Commercial Market Fire Hazard Zone',
            'latitude' => 6.9126,
            'longitude' => 122.0573,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9126 122.0573)', 4326)") : null,
            'radius_meters' => 400,
            'estimated_duration_hours' => 12,
            'is_active' => false,
            'disaster_category' => 'man_made',
            'hazard_type' => 'fire',
            'severity_level' => 'high',
            'reported_by' => $admin->id,
        ]);

        // 4. Chemical Spill Simulation Hazard (Industrial Park)
        Hazard::create([
            'name' => 'Industrial Park Chemical & Gas Leak Zone',
            'latitude' => 6.9280,
            'longitude' => 122.0880,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9280 122.0880)', 4326)") : null,
            'radius_meters' => 350,
            'estimated_duration_hours' => 12,
            'is_active' => false,
            'disaster_category' => 'man_made',
            'hazard_type' => 'chemical_spill',
            'severity_level' => 'high',
            'reported_by' => $admin->id,
        ]);

        // 5. Earthquake Simulation Hazard (Magnitude 6.8 Epicenter Zone)
        Hazard::create([
            'name' => 'Magnitude 6.8 Earthquake Epicenter Zone',
            'latitude' => 6.9380,
            'longitude' => 122.0740,
            'location' => \DB::getDriverName() !== 'sqlite' ? \DB::raw("ST_GeomFromText('POINT(6.9380 122.0740)', 4326)") : null,
            'radius_meters' => 500,
            'estimated_duration_hours' => 24,
            'is_active' => false,
            'disaster_category' => 'natural',
            'hazard_type' => 'earthquake',
            'severity_level' => 'high',
            'reported_by' => $admin->id,
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

        // 5. Create 10 Family Resident Profiles per Barangay (50 Total Residents - REV-07)
        $targetBarangays = [
            'Baliwasan'    => [6.9126, 122.0573],
            'San Jose'     => [6.9230, 122.0450],
            'Tetuan'       => [6.9185, 122.0882],
            'Putik'        => [6.9380, 122.0980],
            'Tumaga'       => [6.9410, 122.0780],
        ];

        $families = [];
        $resCount = 0;

        // Primary Resident Account (Pheinz Reneil Tambis Magnun)
        $pheinzUser = User::create([
            'name' => 'Pheinz Reneil Tambis Magnun',
            'email' => 'pheinz@evacroute.local',
            'password' => bcrypt('password'),
            'role' => 'resident',
            'last_latitude' => 6.9050,
            'last_longitude' => 122.0720,
        ]);

        FamilyProfile::create([
            'user_id' => $pheinzUser->id,
            'headcount' => 4,
            'contact_number' => '09171234567',
            'barangay' => 'Sto. Niño',
            'qr_code_hash' => 'hash_test_code_pheinz',
        ]);

        foreach ($targetBarangays as $bgyName => $coords) {
            for ($k = 1; $k <= 10; $k++) {
                $resCount++;
                $slugName = strtolower(str_replace(' ', '', $bgyName));
                $user = User::create([
                    'name' => "{$bgyName} Resident {$k}",
                    'email' => "resident_{$slugName}_{$k}@evacroute.local",
                    'password' => bcrypt('password'),
                    'role' => 'resident',
                    'last_latitude' => $coords[0] + (rand(-50, 50) / 10000),
                    'last_longitude' => $coords[1] + (rand(-50, 50) / 10000),
                ]);

                $families[] = FamilyProfile::create([
                    'user_id' => $user->id,
                    'headcount' => rand(2, 6),
                    'contact_number' => '0917' . str_pad($resCount, 7, '0', STR_PAD_LEFT),
                    'barangay' => $bgyName,
                    'qr_code_hash' => 'hash_test_code_' . $slugName . '_' . $k,
                ]);
            }
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
            RoadNode::create($node);
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
            RoadEdge::create([
                'source_node_id' => $edge['source_node_id'],
                'target_node_id' => $edge['target_node_id'],
                'distance_meters' => $edge['distance_meters'],
                'geometry' => $edge['geometry'],
                'status' => 'open',
            ]);
            // Reverse edge
            RoadEdge::create([
                'source_node_id' => $edge['target_node_id'],
                'target_node_id' => $edge['source_node_id'],
                'distance_meters' => $edge['distance_meters'],
                'geometry' => array_reverse($edge['geometry']),
                'status' => 'open',
            ]);
        }
    }
}
