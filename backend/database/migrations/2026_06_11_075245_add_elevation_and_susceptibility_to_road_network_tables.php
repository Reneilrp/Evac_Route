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
        Schema::table('road_nodes', function (Blueprint $table) {
            $table->decimal('elevation_meters', 6, 2)->default(0.00)->after('lng');
        });

        Schema::table('road_edges', function (Blueprint $table) {
            $table->decimal('slope_degrees', 4, 2)->default(0.00)->after('distance_meters');
            $table->enum('flood_susceptibility', ['none', 'low', 'medium', 'high'])->default('none')->after('slope_degrees');
            $table->enum('landslide_susceptibility', ['none', 'low', 'medium', 'high'])->default('none')->after('flood_susceptibility');
            $table->decimal('min_elevation_meters', 6, 2)->default(0.00)->after('landslide_susceptibility');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('road_edges', function (Blueprint $table) {
            $table->dropColumn(['slope_degrees', 'flood_susceptibility', 'landslide_susceptibility', 'min_elevation_meters']);
        });

        Schema::table('road_nodes', function (Blueprint $table) {
            $table->dropColumn(['elevation_meters']);
        });
    }
};
