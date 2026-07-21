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
        Schema::table('shelters', function (Blueprint $table) {
            if (!Schema::hasColumn('shelters', 'facility_type')) {
                $table->string('facility_type')->default('evacuation_center')->after('name');
            }
            if (!Schema::hasColumn('shelters', 'is_secured_facility')) {
                $table->boolean('is_secured_facility')->default(false)->after('facility_type');
            }
            if (!Schema::hasColumn('shelters', 'emergency_contact')) {
                $table->string('emergency_contact')->nullable()->after('status');
            }
        });

        Schema::table('hazards', function (Blueprint $table) {
            if (!Schema::hasColumn('hazards', 'disaster_category')) {
                $table->string('disaster_category')->default('natural')->after('name');
            }
            // Ensure hazard_type can hold man-made types (string is compatible with SQLite and MySQL)
            if (Schema::hasColumn('hazards', 'hazard_type')) {
                $table->string('hazard_type')->default('flood')->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shelters', function (Blueprint $table) {
            $table->dropColumn(['facility_type', 'is_secured_facility', 'emergency_contact']);
        });

        Schema::table('hazards', function (Blueprint $table) {
            $table->dropColumn(['disaster_category']);
        });
    }
};
