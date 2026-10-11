<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Shelter;

class EmergencyInfrastructureSeeder extends Seeder
{
    /**
     * Seed official Zamboanga City tactical infrastructure:
     * - Military Bases & Air installations
     * - Bureau of Fire Protection (BFP) Stations
     * - Philippine National Police (ZCPO) Stations
     * - Major Tertiary Hospitals & Trauma Centers
     */
    public function run(): void
    {
        $facilities = [
            // ─── A. MILITARY & AIR INSTALLATIONS ─────────────────────────────
            [
                'name' => 'Edwin Andrews Air Base (EAAB)',
                'barangay' => 'Santa Maria',
                'latitude' => 6.926017,
                'longitude' => 122.066353,
                'max_capacity' => 200,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'military_base',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Camp General Basilio Navarro (WESTMINCOM HQ)',
                'barangay' => 'Calarian',
                'latitude' => 6.917658,
                'longitude' => 122.039623,
                'max_capacity' => 250,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'military_base',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Zamboanga International Airport Tactical Transit',
                'barangay' => 'Baliwasan',
                'latitude' => 6.922241,
                'longitude' => 122.059845,
                'max_capacity' => 300,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'military_base',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],

            // ─── B. BUREAU OF FIRE PROTECTION (BFP) STATIONS ───────────────────
            [
                'name' => 'Zamboanga Fire District Central Station (Zone IV)',
                'barangay' => 'Zone IV',
                'latitude' => 6.907277,
                'longitude' => 122.075001,
                'max_capacity' => 50,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'fire_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Santa Maria Fire Sub-Station',
                'barangay' => 'Santa Maria',
                'latitude' => 6.931005,
                'longitude' => 122.074803,
                'max_capacity' => 40,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'fire_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Culianan Fire Sub-Station (East Coast)',
                'barangay' => 'Culianan',
                'latitude' => 6.971874,
                'longitude' => 122.146460,
                'max_capacity' => 40,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'fire_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Manicahan Fire Sub-Station (East Coast)',
                'barangay' => 'Manicahan',
                'latitude' => 7.022868,
                'longitude' => 122.188279,
                'max_capacity' => 40,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'fire_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Labuan Fire Sub-Station (West Coast)',
                'barangay' => 'Labuan',
                'latitude' => 7.098121,
                'longitude' => 121.903103,
                'max_capacity' => 40,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'fire_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],

            // ─── C. PHILIPPINE NATIONAL POLICE (ZCPO) STATIONS ─────────────────
            [
                'name' => 'ZCPO City Police Headquarters',
                'barangay' => 'Zone IV',
                'latitude' => 6.905192,
                'longitude' => 122.074506,
                'max_capacity' => 100,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'police_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'ZCPO Police Station 1 (Vitali - Far East)',
                'barangay' => 'Vitali',
                'latitude' => 7.371482,
                'longitude' => 122.288702,
                'max_capacity' => 50,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'police_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'ZCPO Police Station 3 (Sangali - East Coast)',
                'barangay' => 'Sangali',
                'latitude' => 7.071605,
                'longitude' => 122.204603,
                'max_capacity' => 50,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'police_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'ZCPO Police Station 4 (Culianan - East Coast)',
                'barangay' => 'Culianan',
                'latitude' => 6.971652,
                'longitude' => 122.145829,
                'max_capacity' => 50,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'police_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'ZCPO Police Station 5 (Divisoria / Putik)',
                'barangay' => 'Putik',
                'latitude' => 6.943923,
                'longitude' => 122.099340,
                'max_capacity' => 50,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'police_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'ZCPO Police Station 6 (Tetuan)',
                'barangay' => 'Tetuan',
                'latitude' => 6.917514,
                'longitude' => 122.090874,
                'max_capacity' => 50,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'police_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'ZCPO Police Station 9 (Ayala - West Coast)',
                'barangay' => 'Ayala',
                'latitude' => 6.963544,
                'longitude' => 121.948177,
                'max_capacity' => 50,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'police_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'ZCPO Police Station 10 (Labuan - Far West)',
                'barangay' => 'Labuan',
                'latitude' => 7.097849,
                'longitude' => 121.903260,
                'max_capacity' => 50,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'police_station',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],

            // ─── D. MAJOR HOSPITALS & TRAUMA NETWORKS ──────────────────────────
            [
                'name' => 'Ciudad Medical de Zamboanga',
                'barangay' => 'Camino Nuevo',
                'latitude' => 6.915067,
                'longitude' => 122.076876,
                'max_capacity' => 150,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'hospital',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => "Zamboanga Doctors' Hospital",
                'barangay' => 'Tetuan',
                'latitude' => 6.915275,
                'longitude' => 122.080119,
                'max_capacity' => 150,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'hospital',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'West Metro Medical Center',
                'barangay' => 'Tumaga',
                'latitude' => 6.923505,
                'longitude' => 122.079362,
                'max_capacity' => 180,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'hospital',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Zamboanga Peninsula Medical Center',
                'barangay' => 'Putik',
                'latitude' => 6.939917,
                'longitude' => 122.091995,
                'max_capacity' => 150,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'hospital',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Brent Hospital and Colleges',
                'barangay' => 'Baliwasan',
                'latitude' => 6.907859,
                'longitude' => 122.068309,
                'max_capacity' => 120,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'hospital',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Camp Navarro General Hospital (Military)',
                'barangay' => 'Calarian',
                'latitude' => 6.917793,
                'longitude' => 122.037815,
                'max_capacity' => 80,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'hospital',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Labuan General Hospital (West Coast District)',
                'barangay' => 'Labuan',
                'latitude' => 7.097568,
                'longitude' => 121.904121,
                'max_capacity' => 100,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'hospital',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
            [
                'name' => 'Cristino Paragas Memorial Hospital (Curuan District)',
                'barangay' => 'Curuan',
                'latitude' => 7.183162,
                'longitude' => 122.219712,
                'max_capacity' => 80,
                'type' => 'secondary',
                'status' => 'open',
                'facility_type' => 'hospital',
                'current_occupancy' => 0,
                'is_secured_facility' => 1,
            ],
        ];

        $created = 0;
        $updated = 0;

        foreach ($facilities as $data) {
            $shelter = Shelter::where('name', $data['name'])->first();

            if (!$shelter) {
                Shelter::create($data);
                $created++;
            } else {
                $shelter->update($data);
                $updated++;
            }
        }

        $this->command->info("Emergency Infrastructure seeded: {$created} created, {$updated} updated.");
    }
}
