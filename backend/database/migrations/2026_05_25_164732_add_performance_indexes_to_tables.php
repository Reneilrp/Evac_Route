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
        Schema::table('users', function (Blueprint $table) {
            $table->index('role');
        });

        Schema::table('shelters', function (Blueprint $table) {
            $table->index('status');
        });

        Schema::table('hazards', function (Blueprint $table) {
            $table->index('is_active');
        });

        Schema::table('ration_templates', function (Blueprint $table) {
            $table->index('is_active');
        });

        Schema::table('evacuation_logs', function (Blueprint $table) {
            $table->index('checked_in_at');
            $table->index('checked_out_at');
            $table->index(['family_profile_id', 'checked_out_at'], 'evac_logs_family_checkout_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
        });

        Schema::table('shelters', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('hazards', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
        });

        Schema::table('ration_templates', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
        });

        Schema::table('evacuation_logs', function (Blueprint $table) {
            $table->dropIndex(['checked_in_at']);
            $table->dropIndex(['checked_out_at']);
            $table->dropIndex('evac_logs_family_checkout_idx');
        });
    }
};
