<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evacuation_logs', function (Blueprint $table) {
            $table->timestamp('ration_claimed_at')->nullable()->after('ration_claimed');
        });
    }

    public function down(): void
    {
        Schema::table('evacuation_logs', function (Blueprint $table) {
            $table->dropColumn('ration_claimed_at');
        });
    }
};
