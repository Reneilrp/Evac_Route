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
            $table->string('severity_level', 20)->default('medium')->change();
        });

        if (Schema::hasTable('pending_incidents') && Schema::hasColumn('pending_incidents', 'severity_level')) {
            Schema::table('pending_incidents', function (Blueprint $table) {
                $table->string('severity_level', 20)->default('medium')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hazards', function (Blueprint $table) {
            $table->enum('severity_level', ['low', 'medium', 'high'])->default('medium')->change();
        });

        if (Schema::hasTable('pending_incidents') && Schema::hasColumn('pending_incidents', 'severity_level')) {
            Schema::table('pending_incidents', function (Blueprint $table) {
                $table->enum('severity_level', ['low', 'medium', 'high'])->default('medium')->change();
            });
        }
    }
};
