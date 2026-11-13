<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acknowledged_earthquakes', function (Blueprint $table) {
            $table->id();
            $table->string('usgs_id')->unique()->index(); // USGS event ID e.g. "us7000abcd"
            $table->string('acknowledged_by')->nullable(); // name/email of acknowledging CDRRMO user
            $table->timestamp('acknowledged_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acknowledged_earthquakes');
    }
};
