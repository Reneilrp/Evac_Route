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
            if (! Schema::hasColumn('hazards', 'geometry_type')) {
                $table->string('geometry_type', 30)->default('circle')->after('radius_meters');
            }
            if (! Schema::hasColumn('hazards', 'corridor_coordinates')) {
                $table->json('corridor_coordinates')->nullable()->after('geometry_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hazards', function (Blueprint $table) {
            if (Schema::hasColumn('hazards', 'corridor_coordinates')) {
                $table->dropColumn('corridor_coordinates');
            }
            if (Schema::hasColumn('hazards', 'geometry_type')) {
                $table->dropColumn('geometry_type');
            }
        });
    }
};
