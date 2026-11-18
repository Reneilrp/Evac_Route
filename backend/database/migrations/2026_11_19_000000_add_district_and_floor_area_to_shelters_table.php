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
            if (! Schema::hasColumn('shelters', 'district')) {
                $table->string('district')->nullable()->after('barangay');
                $table->index('district');
            }
            if (! Schema::hasColumn('shelters', 'floor_area')) {
                $table->decimal('floor_area', 10, 2)->nullable()->after('district');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shelters', function (Blueprint $table) {
            if (Schema::hasColumn('shelters', 'district')) {
                $table->dropIndex(['district']);
                $table->dropColumn('district');
            }
            if (Schema::hasColumn('shelters', 'floor_area')) {
                $table->dropColumn('floor_area');
            }
        });
    }
};
