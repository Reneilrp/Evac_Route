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
        Schema::dropIfExists('road_maintenances');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('road_maintenances', function (Blueprint $table) {
            $table->id();
            $table->text('description');
            $table->decimal('start_latitude', 10, 8);
            $table->decimal('start_longitude', 11, 8);
            $table->decimal('end_latitude', 10, 8);
            $table->decimal('end_longitude', 11, 8);
            $table->boolean('is_active')->default(true);
            $table->decimal('estimated_duration_hours', 5, 2)->nullable();
            $table->timestamps();
        });
    }
};
