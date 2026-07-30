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
            if (! Schema::hasColumn('shelters', 'elevation_meters')) {
                $table->integer('elevation_meters')->default(10)->after('longitude');
            }
            if (! Schema::hasColumn('shelters', 'amenities')) {
                $table->text('amenities')->nullable()->after('elevation_meters');
            }
            if (! Schema::hasColumn('shelters', 'transport_schedule')) {
                $table->string('transport_schedule')->nullable()->after('amenities');
            }
            if (! Schema::hasColumn('shelters', 'barangay')) {
                $table->string('barangay')->nullable()->after('name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shelters', function (Blueprint $table) {
            $table->dropColumn(['elevation_meters', 'amenities', 'transport_schedule', 'barangay']);
        });
    }
};
