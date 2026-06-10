<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('hazards', function (Blueprint $table) {
            $table->enum('hazard_type', ['flood', 'earthquake', 'maintenance'])->default('flood')->after('radius_meters');
            $table->enum('severity_level', ['low', 'medium', 'high'])->default('medium')->after('hazard_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hazards', function (Blueprint $table) {
            $table->dropColumn(['hazard_type', 'severity_level']);
        });
    }
};
