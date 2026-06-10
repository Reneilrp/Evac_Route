<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('road_nodes', function (Blueprint $table) {
            $table->id();
            $table->decimal('lat', 11, 8)->index();
            $table->decimal('lng', 11, 8)->index();
            $table->string('label')->nullable(); // e.g., "Tetuan Main Road Junction"
            $table->timestamps();
        });

        Schema::create('road_edges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_node_id')->constrained('road_nodes')->onDelete('cascade');
            $table->foreignId('target_node_id')->constrained('road_nodes')->onDelete('cascade');
            $table->decimal('distance_meters', 10, 2);
            $table->json('geometry');              // Array of [lat, lng] coordinate pairs
            $table->enum('status', ['open', 'blocked', 'danger'])->default('open');
            $table->string('block_reason')->nullable(); // e.g., "Debris reported by LGU"
            $table->timestamps();

            $table->index(['source_node_id', 'target_node_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('road_edges');
        Schema::dropIfExists('road_nodes');
    }
};
