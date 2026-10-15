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
            if (!Schema::hasColumn('hazards', 'barangay')) {
                $table->string('barangay', 100)->nullable()->after('name');
            }
            if (!Schema::hasColumn('hazards', 'origin_type')) {
                $table->string('origin_type', 50)->default('official_declaration')->after('reported_by');
            }
            if (!Schema::hasColumn('hazards', 'preset_key')) {
                $table->string('preset_key', 50)->nullable()->after('origin_type');
            }
        });

        Schema::table('rescue_missions', function (Blueprint $table) {
            if (!Schema::hasColumn('rescue_missions', 'intake_source')) {
                $table->string('intake_source', 50)->default('mobile_sos')->after('pending_incident_id');
            }
            if (!Schema::hasColumn('rescue_missions', 'informant_name')) {
                $table->string('informant_name', 150)->nullable()->after('intake_source');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hazards', function (Blueprint $table) {
            if (Schema::hasColumn('hazards', 'preset_key')) {
                $table->dropColumn('preset_key');
            }
            if (Schema::hasColumn('hazards', 'origin_type')) {
                $table->dropColumn('origin_type');
            }
            if (Schema::hasColumn('hazards', 'barangay')) {
                $table->dropColumn('barangay');
            }
        });

        Schema::table('rescue_missions', function (Blueprint $table) {
            if (Schema::hasColumn('rescue_missions', 'informant_name')) {
                $table->dropColumn('informant_name');
            }
            if (Schema::hasColumn('rescue_missions', 'intake_source')) {
                $table->dropColumn('intake_source');
            }
        });
    }
};
