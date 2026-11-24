<?php

namespace Database\Seeders;

use App\Models\RescueMission;
use App\Models\RescueUnit;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Database\Seeder;

class RescueCriticalMissionsSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        $adminId = $admin ? $admin->id : 1;

        // Fetch or ensure the 3 dedicated Fleet Assets
        $unitBoat = RescueUnit::firstOrCreate(
            ['call_sign' => 'BOAT-ALPHA'],
            [
                'name' => 'Zamboanga Rescue Boat Alpha',
                'unit_type' => 'water_rescue',
                'status' => 'dispatched',
                'current_latitude' => 6.9155,
                'current_longitude' => 122.0790,
                'contact_number' => '0917-BOAT-911',
                'capacity_persons' => 8,
            ]
        );

        $unitDelta = RescueUnit::firstOrCreate(
            ['call_sign' => 'DELTA-3'],
            [
                'name' => 'QRT 4x4 Heavy Rescue Truck 03',
                'unit_type' => 'high_clearance_truck',
                'status' => 'dispatched',
                'current_latitude' => 6.9140,
                'current_longitude' => 122.0810,
                'contact_number' => '0917-QRT-DELTA',
                'capacity_persons' => 15,
            ]
        );

        $unitMedic = RescueUnit::firstOrCreate(
            ['call_sign' => 'MEDIC-1'],
            [
                'name' => 'Zamboanga Medic Ambulance 01',
                'unit_type' => 'medical_ambulance',
                'status' => 'dispatched',
                'current_latitude' => 6.9210,
                'current_longitude' => 122.0750,
                'contact_number' => '0917-MEDIC-911',
                'capacity_persons' => 4,
            ]
        );

        // Target shelters
        $baliwasanShelter = Shelter::where('barangay', 'Baliwasan')->first() ?: Shelter::first();
        $tetuanShelter = Shelter::where('barangay', 'Tetuan')->first() ?: Shelter::first();
        $sanJoseShelter = Shelter::where('barangay', 'San Jose Gusu')->first() ?: Shelter::skip(1)->first() ?: Shelter::first();

        // 1. Mission 1 (Water Rescue): Hadjirul Family (Baliwasan Shoreline) -> Assigned to BOAT-ALPHA
        RescueMission::updateOrCreate(
            ['control_no' => 'RES-CRIT-001'],
            [
                'rescue_unit_id' => $unitBoat->id,
                'status' => 'dispatched',
                'victim_name' => 'Amir & Fatima Hadjirul',
                'victim_phone' => '09175550101',
                'headcount' => 5,
                'barangay' => 'Baliwasan',
                'victim_latitude' => 6.9152,
                'victim_longitude' => 122.0614,
                'target_shelter_id' => $baliwasanShelter ? $baliwasanShelter->id : null,
                'triage_level' => 'critical',
                'situation_description' => 'Elderly grandmother bedridden on 2nd floor, 1 infant. Rising coastal storm surge entering ground level.',
                'special_needs' => 'Stretcher for bedridden senior, life vest for infant',
                'dispatched_by' => $adminId,
                'dispatched_at' => now(),
            ]
        );

        // 2. Mission 2 (4x4 Flood Extraction): Dela Cruz Family (Tetuan Riverbank) -> Assigned to DELTA-3
        RescueMission::updateOrCreate(
            ['control_no' => 'RES-CRIT-002'],
            [
                'rescue_unit_id' => $unitDelta->id,
                'status' => 'dispatched',
                'victim_name' => 'Eduardo & Maria Dela Cruz',
                'victim_phone' => '09185550202',
                'headcount' => 4,
                'barangay' => 'Tetuan',
                'victim_latitude' => 6.9248,
                'victim_longitude' => 122.0862,
                'target_shelter_id' => $tetuanShelter ? $tetuanShelter->id : null,
                'triage_level' => 'critical',
                'situation_description' => 'River overflow flooded lower floor. 4 family members trapped in attic crawlspace.',
                'special_needs' => 'Attic breach equipment, high buoyancy rescue float',
                'dispatched_by' => $adminId,
                'dispatched_at' => now(),
            ]
        );

        // 3. Mission 3 (Emergency Medical Triage): Clara & Baby Gabriel Mendoza -> Assigned to MEDIC-1
        RescueMission::updateOrCreate(
            ['control_no' => 'RES-CRIT-003'],
            [
                'rescue_unit_id' => $unitMedic->id,
                'status' => 'dispatched',
                'victim_name' => 'Clara & Infant Gabriel Mendoza',
                'victim_phone' => '09195550303',
                'headcount' => 3,
                'barangay' => 'San Jose Gusu',
                'victim_latitude' => 6.9280,
                'victim_longitude' => 122.0670,
                'target_shelter_id' => $sanJoseShelter ? $sanJoseShelter->id : null,
                'triage_level' => 'critical',
                'situation_description' => 'Mother in labor with 1 infant, power outage in residence. Water rising rapidly.',
                'special_needs' => 'Emergency neonatal delivery kit, portable oxygen, thermal blanket',
                'dispatched_by' => $adminId,
                'dispatched_at' => now(),
            ]
        );
    }
}
