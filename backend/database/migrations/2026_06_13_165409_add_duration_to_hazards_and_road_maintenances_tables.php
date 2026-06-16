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
            $table->integer('estimated_duration_hours')->nullable()->after('radius_meters');
        });

        Schema::table('road_maintenances', function (Blueprint $table) {
            $table->integer('estimated_duration_hours')->nullable()->after('end_longitude');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hazards', function (Blueprint $table) {
            $table->dropColumn('estimated_duration_hours');
        });

        Schema::table('road_maintenances', function (Blueprint $table) {
            $table->dropColumn('estimated_duration_hours');
        });
    }
};
