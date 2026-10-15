<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pending_incidents', function (Blueprint $table) {
            $table->unsignedSmallInteger('headcount')->default(1)->after('severity_level');
            $table->json('modifiers')->nullable()->after('headcount');
        });
    }

    public function down(): void
    {
        Schema::table('pending_incidents', function (Blueprint $table) {
            $table->dropColumn(['headcount', 'modifiers']);
        });
    }
};
