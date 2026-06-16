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
        Schema::create('road_maintenances', function (Blueprint $table) {
            $table->id();
            $table->string('description'); // e.g., "Bridge Repair - Alternate Route Required"
            $table->decimal('start_latitude', 11, 8);
            $table->decimal('start_longitude', 11, 8);
            $table->decimal('end_latitude', 11, 8);
            $table->decimal('end_longitude', 11, 8);
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
        Schema::dropIfExists('road_maintenances');
    }
};
