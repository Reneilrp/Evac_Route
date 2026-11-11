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
        if (Schema::hasTable('rescue_missions') && !Schema::hasColumn('rescue_missions', 'archived_at')) {
            Schema::table('rescue_missions', function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->after('completed_at')->index();
            });
        }

        if (Schema::hasTable('broadcast_alerts') && !Schema::hasColumn('broadcast_alerts', 'archived_at')) {
            Schema::table('broadcast_alerts', function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->after('created_by')->index();
            });
        }

        if (Schema::hasTable('evacuation_logs') && !Schema::hasColumn('evacuation_logs', 'archived_at')) {
            Schema::table('evacuation_logs', function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->after('checked_out_at')->index();
            });
        }

        if (Schema::hasTable('dispatch_orders') && !Schema::hasColumn('dispatch_orders', 'archived_at')) {
            Schema::table('dispatch_orders', function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->after('delivered_at')->index();
            });
        }

        if (Schema::hasTable('audit_logs') && !Schema::hasColumn('audit_logs', 'archived_at')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->after('new_values')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('rescue_missions') && Schema::hasColumn('rescue_missions', 'archived_at')) {
            Schema::table('rescue_missions', function (Blueprint $table) {
                $table->dropColumn('archived_at');
            });
        }

        if (Schema::hasTable('broadcast_alerts') && Schema::hasColumn('broadcast_alerts', 'archived_at')) {
            Schema::table('broadcast_alerts', function (Blueprint $table) {
                $table->dropColumn('archived_at');
            });
        }

        if (Schema::hasTable('evacuation_logs') && Schema::hasColumn('evacuation_logs', 'archived_at')) {
            Schema::table('evacuation_logs', function (Blueprint $table) {
                $table->dropColumn('archived_at');
            });
        }

        if (Schema::hasTable('dispatch_orders') && Schema::hasColumn('dispatch_orders', 'archived_at')) {
            Schema::table('dispatch_orders', function (Blueprint $table) {
                $table->dropColumn('archived_at');
            });
        }

        if (Schema::hasTable('audit_logs') && Schema::hasColumn('audit_logs', 'archived_at')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->dropColumn('archived_at');
            });
        }
    }
};
