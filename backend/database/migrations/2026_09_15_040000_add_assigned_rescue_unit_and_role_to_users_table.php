<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('assigned_rescue_unit_id')
                ->nullable()
                ->after('operator_type')
                ->constrained('rescue_units')
                ->nullOnDelete();
            $table->string('rescue_role', 50)
                ->nullable()
                ->after('assigned_rescue_unit_id');
        });

        // Backfill: If any user was assigned as personnel on a rescue_unit, link their assigned_rescue_unit_id
        $units = DB::table('rescue_units')->whereNotNull('assigned_personnel_id')->get();
        foreach ($units as $unit) {
            $defaultRole = match($unit->unit_type) {
                'medical_ambulance' => 'lead_medic',
                'high_clearance_truck' => 'heavy_driver',
                default => 'boat_pilot',
            };

            DB::table('users')
                ->where('id', $unit->assigned_personnel_id)
                ->update([
                    'assigned_rescue_unit_id' => $unit->id,
                    'rescue_role' => $defaultRole,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['assigned_rescue_unit_id']);
            $table->dropColumn(['assigned_rescue_unit_id', 'rescue_role']);
        });
    }
};
