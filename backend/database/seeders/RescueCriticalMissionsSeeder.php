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

        // Ensure active Rescue Unit
        $unit = RescueUnit::firstOrCreate(
            ['call_sign' => 'BOAT-ALPHA'],
            [
                'name' => 'Zamboanga Rescue Boat Alpha',
                'vehicle_type' => 'boat',
                'status' => 'dispatched',
                'current_latitude' => 6.9050,
                'current_longitude' => 122.0750,
            ]
        );

        // Link rescuer user to this unit
        $rescuer = User::where('operator_type', 'rescue')->orWhere('email', 'rescue1@lgu.gov.ph')->first();
        if ($rescuer) {
            $rescuer->update([
                'assigned_rescue_unit_id' => $unit->id,
                'rescue_role' => $rescuer->rescue_role ?: 'boat_pilot',
            ]);
        }

        // Target shelters
        $baliwasanShelter = Shelter::where('barangay', 'Baliwasan')->first() ?: Shelter::first();
        $tetuanShelter = Shelter::where('barangay', 'Tetuan')->first() ?: Shelter::first();

        // 1. Critical Test Mission 1: Hadjirul Family (Baliwasan Shoreline)
        RescueMission::updateOrCreate(
            ['control_no' => 'RES-CRIT-001'],
            [
                'rescue_unit_id' => $unit->id,
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

        // 2. Critical Test Mission 2: Dela Cruz Family (Tetuan Riverbank)
        RescueMission::updateOrCreate(
            ['control_no' => 'RES-CRIT-002'],
            [
                'rescue_unit_id' => $unit->id,
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
    }
}
