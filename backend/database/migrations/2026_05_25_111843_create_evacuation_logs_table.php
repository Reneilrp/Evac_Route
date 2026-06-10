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
        Schema::create('evacuation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_profile_id')->constrained('family_profiles')->onDelete('cascade');
            $table->foreignId('shelter_id')->constrained('shelters')->onDelete('cascade');
            $table->timestamp('checked_in_at')->useCurrent();
            $table->timestamp('checked_out_at')->nullable(); // Supports shelter transfers
            $table->integer('recorded_headcount');
            $table->boolean('ration_claimed')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evacuation_logs');
    }
};
