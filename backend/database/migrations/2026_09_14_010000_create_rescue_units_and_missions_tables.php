<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rescue_units', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('call_sign')->unique();
            $table->enum('unit_type', ['water_rescue', 'medical_ambulance', 'high_clearance_truck'])->default('water_rescue');
            $table->enum('status', ['standby', 'dispatched', 'en_route', 'on_scene', 'transporting', 'off_duty'])->default('standby');
            $table->decimal('current_latitude', 11, 8)->nullable();
            $table->decimal('current_longitude', 11, 8)->nullable();
            $table->foreignId('assigned_personnel_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('contact_number')->nullable();
            $table->unsignedSmallInteger('capacity_persons')->default(6);
            $table->timestamps();
        });

        Schema::create('rescue_missions', function (Blueprint $table) {
            $table->id();
            $table->string('control_no')->unique();
            $table->foreignId('pending_incident_id')->nullable()->constrained('pending_incidents')->nullOnDelete();
            $table->foreignId('rescue_unit_id')->constrained('rescue_units')->cascadeOnDelete();
            $table->foreignId('dispatched_by')->constrained('users');
            $table->enum('status', ['dispatched', 'en_route', 'on_scene', 'transporting', 'completed', 'aborted'])->default('dispatched');
            $table->enum('triage_level', ['critical', 'urgent', 'standard'])->default('urgent');
            $table->string('victim_name');
            $table->string('victim_phone')->nullable();
            $table->decimal('victim_latitude', 11, 8);
            $table->decimal('victim_longitude', 11, 8);
            $table->string('barangay')->nullable();
            $table->unsignedSmallInteger('headcount')->default(1);
            $table->string('special_needs')->nullable();
            $table->text('situation_description')->nullable();
            $table->foreignId('target_shelter_id')->nullable()->constrained('shelters')->nullOnDelete();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('arrived_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rescue_missions');
        Schema::dropIfExists('rescue_units');
    }
};
