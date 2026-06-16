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
        Schema::table('evacuation_logs', function (Blueprint $table) {
            $table->json('claimed_ration_items')->nullable()->after('ration_claimed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evacuation_logs', function (Blueprint $table) {
            $table->dropColumn('claimed_ration_items');
        });
    }
};
