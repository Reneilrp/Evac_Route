<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Expand hazard_type from restricted enum to string (varchar 50)
        // to support all disaster types: building_fire, active_shooter, siege, chemical_spill, etc.
        DB::statement("ALTER TABLE pending_incidents MODIFY COLUMN hazard_type VARCHAR(50) NOT NULL DEFAULT 'flood'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE pending_incidents MODIFY COLUMN hazard_type ENUM('flood','earthquake','maintenance','debris') NOT NULL DEFAULT 'flood'");
    }
};
