<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('operator_type')->nullable()->after('role');
        });

        // Backfill existing staff users based on role and email
        DB::table('users')->where('role', 'admin')->update(['operator_type' => 'admin']);
        DB::table('users')->where('email', 'like', '%rescue%')->update(['operator_type' => 'rescue']);
        DB::table('users')->where('email', 'like', '%scanner%')->update(['operator_type' => 'scanner']);
        DB::table('users')->where('email', 'like', '%logistics%')->update(['operator_type' => 'logistics']);
        DB::table('users')->whereNull('operator_type')->where('role', 'lgu_staff')->update(['operator_type' => 'general']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('operator_type');
        });
    }
};
