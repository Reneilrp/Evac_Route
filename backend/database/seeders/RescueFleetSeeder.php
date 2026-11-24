<?php

namespace Database\Seeders;

use App\Models\RescueUnit;
use App\Models\User;
use Illuminate\Database\Seeder;

class RescueFleetSeeder extends Seeder
{
    public function run(): void
    {
        // ─── 1. Marine Water Search & Rescue (WASAR) ───
        $boatLead = User::updateOrCreate(['email' => 'rescue1@lgu.gov.ph'], [
            'name' => 'Capt. Arnaldo Ramos (WASAR Boat Lead)',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'boat_pilot',
            'status' => 'active',
        ]);
        User::updateOrCreate(['email' => 'boat1@lgu.gov.ph'], [
            'name' => 'Capt. Arnaldo Ramos (WASAR Boat Lead)',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'boat_pilot',
            'status' => 'active',
        ]);

        $unitBoat = RescueUnit::updateOrCreate(['call_sign' => 'BOAT-ALPHA'], [
            'name' => 'Zamboanga Rescue Boat Alpha',
            'call_sign' => 'BOAT-ALPHA',
            'unit_type' => 'water_rescue',
            'status' => 'dispatched',
            'current_latitude' => 6.9155,
            'current_longitude' => 122.0790,
            'assigned_personnel_id' => $boatLead->id,
            'contact_number' => '0917-BOAT-911',
            'capacity_persons' => 8,
        ]);
        $boatLead->update(['assigned_rescue_unit_id' => $unitBoat->id, 'rescue_role' => 'boat_pilot']);
        User::where('email', 'boat1@lgu.gov.ph')->update(['assigned_rescue_unit_id' => $unitBoat->id, 'rescue_role' => 'boat_pilot']);

        User::updateOrCreate(['email' => 'mateo.cruz@cdrrmo.zamboanga.gov.ph'], [
            'name' => 'Sgt. Mateo Cruz',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'rescue_swimmer',
            'assigned_rescue_unit_id' => $unitBoat->id,
            'status' => 'active',
        ]);

        User::updateOrCreate(['email' => 'liza.santos@cdrrmo.zamboanga.gov.ph'], [
            'name' => 'Officer Liza Santos',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'crew',
            'assigned_rescue_unit_id' => $unitBoat->id,
            'status' => 'active',
        ]);

        // ─── 2. Emergency Medical Services (EMS Ambulance) ───
        $medicLead = User::updateOrCreate(['email' => 'medic1@lgu.gov.ph'], [
            'name' => 'Dr. Maria Elena Torres (Lead Paramedic)',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'lead_medic',
            'status' => 'active',
        ]);
        User::updateOrCreate(['email' => 'medic1.lead@cdrrmo.zamboanga.gov.ph'], [
            'name' => 'Dr. Maria Elena Torres (Lead Paramedic)',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'lead_medic',
            'status' => 'active',
        ]);

        $unitMedic = RescueUnit::updateOrCreate(['call_sign' => 'MEDIC-1'], [
            'name' => 'Zamboanga Medic Ambulance 01',
            'call_sign' => 'MEDIC-1',
            'unit_type' => 'medical_ambulance',
            'status' => 'dispatched',
            'current_latitude' => 6.9210,
            'current_longitude' => 122.0750,
            'assigned_personnel_id' => $medicLead->id,
            'contact_number' => '0917-MEDIC-911',
            'capacity_persons' => 4,
        ]);
        $medicLead->update(['assigned_rescue_unit_id' => $unitMedic->id, 'rescue_role' => 'lead_medic']);
        User::where('email', 'medic1.lead@cdrrmo.zamboanga.gov.ph')->update(['assigned_rescue_unit_id' => $unitMedic->id, 'rescue_role' => 'lead_medic']);

        User::updateOrCreate(['email' => 'noel.bautista@cdrrmo.zamboanga.gov.ph'], [
            'name' => 'EMT Noel Bautista',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'crew',
            'assigned_rescue_unit_id' => $unitMedic->id,
            'status' => 'active',
        ]);

        // ─── 3. Quick Response Team (QRT 4x4 Heavy Rescue Truck) ───
        $deltaLead = User::updateOrCreate(['email' => 'delta3@lgu.gov.ph'], [
            'name' => 'Officer Ronald Macapagal (Heavy Driver)',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'heavy_driver',
            'status' => 'active',
        ]);
        User::updateOrCreate(['email' => 'delta3.lead@cdrrmo.zamboanga.gov.ph'], [
            'name' => 'Officer Ronald Macapagal (Heavy Driver)',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'heavy_driver',
            'status' => 'active',
        ]);

        $unitDelta = RescueUnit::updateOrCreate(['call_sign' => 'DELTA-3'], [
            'name' => 'QRT 4x4 Heavy Rescue Truck 03',
            'call_sign' => 'DELTA-3',
            'unit_type' => 'high_clearance_truck',
            'status' => 'dispatched',
            'current_latitude' => 6.9140,
            'current_longitude' => 122.0810,
            'assigned_personnel_id' => $deltaLead->id,
            'contact_number' => '0917-QRT-DELTA',
            'capacity_persons' => 15,
        ]);
        $deltaLead->update(['assigned_rescue_unit_id' => $unitDelta->id, 'rescue_role' => 'heavy_driver']);
        User::where('email', 'delta3.lead@cdrrmo.zamboanga.gov.ph')->update(['assigned_rescue_unit_id' => $unitDelta->id, 'rescue_role' => 'heavy_driver']);

        User::updateOrCreate(['email' => 'bryan.gomez@cdrrmo.zamboanga.gov.ph'], [
            'name' => 'Rescue Tech Bryan Gomez',
            'password' => bcrypt('password'),
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'rescue_swimmer',
            'assigned_rescue_unit_id' => $unitDelta->id,
            'status' => 'active',
        ]);
    }
}
