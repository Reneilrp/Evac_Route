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
            if (!Schema::hasColumn('shelters', 'activation_status')) {
                $table->string('activation_status')->default('open')->after('status');
            }
            if (!Schema::hasColumn('shelters', 'activation_trigger')) {
                $table->string('activation_trigger')->nullable()->after('activation_status');
            }
            if (!Schema::hasColumn('shelters', 'activated_at')) {
                $table->timestamp('activated_at')->nullable()->after('activation_trigger');
            }
            if (!Schema::hasColumn('shelters', 'cswd_mobilized')) {
                $table->boolean('cswd_mobilized')->default(false)->after('activated_at');
            }
            if (!Schema::hasColumn('shelters', 'cswd_mobilized_at')) {
                $table->timestamp('cswd_mobilized_at')->nullable()->after('cswd_mobilized');
            }
            if (!Schema::hasColumn('shelters', 'cswd_mobilized_team')) {
                $table->string('cswd_mobilized_team')->nullable()->after('cswd_mobilized_at');
            }
        });

        Schema::table('evacuation_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('evacuation_logs', 'actual_headcount')) {
                $table->integer('actual_headcount')->nullable()->after('recorded_headcount');
            }
            if (!Schema::hasColumn('evacuation_logs', 'is_temporary_offsite')) {
                $table->boolean('is_temporary_offsite')->default(false)->after('actual_headcount');
            }
            if (!Schema::hasColumn('evacuation_logs', 'temporary_offsite_at')) {
                $table->timestamp('temporary_offsite_at')->nullable()->after('is_temporary_offsite');
            }
            if (!Schema::hasColumn('evacuation_logs', 'walk_in_voucher')) {
                $table->string('walk_in_voucher')->nullable()->after('temporary_offsite_at');
            }
            if (!Schema::hasColumn('evacuation_logs', 'vulnerabilities')) {
                $table->json('vulnerabilities')->nullable()->after('walk_in_voucher');
            }
        });

        if (!Schema::hasTable('shelter_donations')) {
            Schema::create('shelter_donations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('shelter_id')->constrained('shelters')->onDelete('cascade');
                $table->string('donor_name');
                $table->string('item_category')->default('hot_meals');
                $table->string('item_description')->nullable();
                $table->integer('quantity_servings')->default(1);
                $table->string('distribution_mode')->default('immediate_community_serving');
                $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shelter_donations');

        Schema::table('evacuation_logs', function (Blueprint $table) {
            $table->dropColumn([
                'actual_headcount',
                'is_temporary_offsite',
                'temporary_offsite_at',
                'walk_in_voucher',
                'vulnerabilities',
            ]);
        });

        Schema::table('shelters', function (Blueprint $table) {
            $table->dropColumn([
                'activation_status',
                'activation_trigger',
                'activated_at',
                'cswd_mobilized',
                'cswd_mobilized_at',
                'cswd_mobilized_team',
            ]);
        });
    }
};
