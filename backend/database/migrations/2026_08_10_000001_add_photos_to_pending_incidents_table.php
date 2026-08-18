<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pending_incidents', function (Blueprint $table) {
            $table->json('photos')->nullable()->after('photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('pending_incidents', function (Blueprint $table) {
            $table->dropColumn('photos');
        });
    }
};
