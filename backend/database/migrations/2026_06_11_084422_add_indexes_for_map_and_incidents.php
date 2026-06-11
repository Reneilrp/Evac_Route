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
        Schema::table('pending_incidents', function (Blueprint $table) {
            $table->index('status');
        });

        Schema::table('shelters', function (Blueprint $table) {
            $table->index(['status', 'current_occupancy']);
        });

        Schema::table('road_edges', function (Blueprint $table) {
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pending_incidents', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('shelters', function (Blueprint $table) {
            $table->dropIndex(['status', 'current_occupancy']);
        });

        Schema::table('road_edges', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });
    }
};
