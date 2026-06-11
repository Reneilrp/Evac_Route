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
        Schema::create('hazards', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., "Flooded Tetuan Bridge"
            $table->decimal('latitude', 11, 8);
            $table->decimal('longitude', 11, 8);

            // Add a true spatial column and index for R-tree geographic bounding box lookups
            // Note: POINT type is required for SPATIAL INDEX in MySQL/PostgreSQL
            if (\Illuminate\Support\Facades\DB::getDriverName() !== 'sqlite') {
                $table->geography('location', subtype: 'point', srid: 4326)->spatialIndex();
            }

            $table->decimal('radius_meters', 8, 2)->default(50); // How big the flood is
            $table->boolean('is_active')->default(true);
            $table->foreignId('reported_by')->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hazards');
    }
};
