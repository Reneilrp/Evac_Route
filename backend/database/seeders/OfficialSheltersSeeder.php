<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Shelter;
use Illuminate\Support\Facades\DB;

class OfficialSheltersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $csvPath = base_path('../guidelines/refined_shelters.csv');
        if (!file_exists($csvPath)) {
            $this->command->error("CSV file not found at: {$csvPath}");
            return;
        }

        $file = fopen($csvPath, 'r');
        $header = fgetcsv($file); // name,location,latitude,longitude,max_capacity,type

        $imported = 0;
        $updated = 0;
        while (($row = fgetcsv($file)) !== false) {
            $data = array_combine($header, $row);
            
            $shelter = Shelter::where('name', $data['name'])->first();
            
            if (!$shelter) {
                Shelter::create([
                    'name' => $data['name'],
                    'barangay' => $data['location'],
                    'district' => $data['district'] ?? null,
                    'floor_area' => isset($data['floor_area']) && $data['floor_area'] !== '' ? (float) $data['floor_area'] : null,
                    'latitude' => $data['latitude'],
                    'longitude' => $data['longitude'],
                    'max_capacity' => $data['max_capacity'],
                    'type' => $data['type'],
                    'status' => $data['type'] === 'primary' ? 'open' : 'closed', // Primary open by default
                    'facility_type' => $data['type'] === 'primary' ? 'Evacuation Center' : 'Covered Court',
                    'current_occupancy' => 0,
                    'is_secured_facility' => $data['type'] === 'primary' ? 1 : 0,
                ]);
                $imported++;
            } else {
                $shelter->update([
                    'barangay' => $data['location'],
                    'district' => $data['district'] ?? $shelter->district,
                    'floor_area' => isset($data['floor_area']) && $data['floor_area'] !== '' ? (float) $data['floor_area'] : $shelter->floor_area,
                    'latitude' => $data['latitude'],
                    'longitude' => $data['longitude'],
                    'max_capacity' => $data['max_capacity'],
                    'type' => $data['type'],
                ]);
                $updated++;
            }
        }
        fclose($file);
        
        $this->command->info("Successfully seeded: {$imported} created, {$updated} updated.");
    }
}
