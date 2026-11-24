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
            if (!Schema::hasColumn('shelters', 'allowed_hazards')) {
                $table->json('allowed_hazards')->nullable()->after('facility_type');
            }
        });

        Schema::table('evacuation_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('evacuation_logs', 'is_duplicate_claim_warning')) {
                $table->boolean('is_duplicate_claim_warning')->default(false)->after('ration_claimed');
            }
            if (!Schema::hasColumn('evacuation_logs', 'nfi_items_claimed')) {
                $table->json('nfi_items_claimed')->nullable()->after('claimed_ration_items');
            }
        });

        Schema::table('hazards', function (Blueprint $table) {
            if (!Schema::hasColumn('hazards', 'corridor_name')) {
                $table->string('corridor_name')->nullable()->after('barangay');
            }
            if (!Schema::hasColumn('hazards', 'rainfall_trigger_minutes')) {
                $table->integer('rainfall_trigger_minutes')->nullable()->after('corridor_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shelters', function (Blueprint $table) {
            if (Schema::hasColumn('shelters', 'allowed_hazards')) {
                $table->dropColumn('allowed_hazards');
            }
        });

        Schema::table('evacuation_logs', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('evacuation_logs', 'is_duplicate_claim_warning')) {
                $cols[] = 'is_duplicate_claim_warning';
            }
            if (Schema::hasColumn('evacuation_logs', 'nfi_items_claimed')) {
                $cols[] = 'nfi_items_claimed';
            }
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('hazards', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('hazards', 'corridor_name')) {
                $cols[] = 'corridor_name';
            }
            if (Schema::hasColumn('hazards', 'rainfall_trigger_minutes')) {
                $cols[] = 'rainfall_trigger_minutes';
            }
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
