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
        Schema::table('ration_template_items', function (Blueprint $table) {
            $table->string('allocation_type')->default('per_head')->after('quantity_per_head');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ration_template_items', function (Blueprint $table) {
            $table->dropColumn('allocation_type');
        });
    }
};
