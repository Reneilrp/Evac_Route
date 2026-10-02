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
        Schema::table('rescue_missions', function (Blueprint $table) {
            if (!Schema::hasColumn('rescue_missions', 'staging_point_id')) {
                $table->foreignId('staging_point_id')->nullable()->after('target_shelter_id')->constrained('shelters')->nullOnDelete();
            }
            $table->string('status', 32)->default('dispatched')->change();
        });

        Schema::table('evacuation_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('evacuation_logs', 'checkin_method')) {
                $table->string('checkin_method', 32)->default('qr')->after('recorded_headcount');
            }
            if (!Schema::hasColumn('evacuation_logs', 'checkin_latitude')) {
                $table->decimal('checkin_latitude', 11, 8)->nullable()->after('checkin_method');
            }
            if (!Schema::hasColumn('evacuation_logs', 'checkin_longitude')) {
                $table->decimal('checkin_longitude', 11, 8)->nullable()->after('checkin_latitude');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rescue_missions', function (Blueprint $table) {
            $table->dropForeign(['staging_point_id']);
            $table->dropColumn('staging_point_id');
        });

        Schema::table('evacuation_logs', function (Blueprint $table) {
            $table->dropColumn(['checkin_method', 'checkin_latitude', 'checkin_longitude']);
        });
    }
};
