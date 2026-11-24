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
            if (! Schema::hasColumn('hazards', 'pending_incident_id')) {
                $table->foreignId('pending_incident_id')->nullable()->after('id')->constrained('pending_incidents')->nullOnDelete();
            }
            if (! Schema::hasColumn('hazards', 'validation_status')) {
                $table->string('validation_status', 50)->default('unverified')->after('is_active');
            }
            if (! Schema::hasColumn('hazards', 'is_validated_by_cdrrmo')) {
                $table->boolean('is_validated_by_cdrrmo')->default(false)->after('validation_status');
            }
            if (! Schema::hasColumn('hazards', 'validated_by')) {
                $table->foreignId('validated_by')->nullable()->after('is_validated_by_cdrrmo')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('hazards', 'validated_at')) {
                $table->timestamp('validated_at')->nullable()->after('validated_by');
            }
        });

        Schema::table('pending_incidents', function (Blueprint $table) {
            if (! Schema::hasColumn('pending_incidents', 'hazard_id')) {
                $table->foreignId('hazard_id')->nullable()->after('id')->constrained('hazards')->nullOnDelete();
            }
            if (! Schema::hasColumn('pending_incidents', 'validation_status')) {
                $table->string('validation_status', 50)->default('community_active')->after('status');
            }
            if (! Schema::hasColumn('pending_incidents', 'geometry_type')) {
                $table->string('geometry_type', 30)->default('circle')->after('validation_status');
            }
            if (! Schema::hasColumn('pending_incidents', 'radius_meters')) {
                $table->integer('radius_meters')->default(75)->after('geometry_type');
            }
            if (! Schema::hasColumn('pending_incidents', 'corridor_coordinates')) {
                $table->json('corridor_coordinates')->nullable()->after('radius_meters');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pending_incidents', function (Blueprint $table) {
            if (Schema::hasColumn('pending_incidents', 'corridor_coordinates')) {
                $table->dropColumn('corridor_coordinates');
            }
            if (Schema::hasColumn('pending_incidents', 'radius_meters')) {
                $table->dropColumn('radius_meters');
            }
            if (Schema::hasColumn('pending_incidents', 'geometry_type')) {
                $table->dropColumn('geometry_type');
            }
            if (Schema::hasColumn('pending_incidents', 'validation_status')) {
                $table->dropColumn('validation_status');
            }
            if (Schema::hasColumn('pending_incidents', 'hazard_id')) {
                $table->dropForeign(['hazard_id']);
                $table->dropColumn('hazard_id');
            }
        });

        Schema::table('hazards', function (Blueprint $table) {
            if (Schema::hasColumn('hazards', 'validated_at')) {
                $table->dropColumn('validated_at');
            }
            if (Schema::hasColumn('hazards', 'validated_by')) {
                $table->dropForeign(['validated_by']);
                $table->dropColumn('validated_by');
            }
            if (Schema::hasColumn('hazards', 'is_validated_by_cdrrmo')) {
                $table->dropColumn('is_validated_by_cdrrmo');
            }
            if (Schema::hasColumn('hazards', 'validation_status')) {
                $table->dropColumn('validation_status');
            }
            if (Schema::hasColumn('hazards', 'pending_incident_id')) {
                $table->dropForeign(['pending_incident_id']);
                $table->dropColumn('pending_incident_id');
            }
        });
    }
};
