<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pending_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reported_by')->constrained('users')->onDelete('cascade');
            $table->string('name');                          // e.g., "Flooded road near Tetuan"
            $table->decimal('latitude', 11, 8);
            $table->decimal('longitude', 11, 8);
            $table->enum('hazard_type', ['flood', 'earthquake', 'maintenance', 'debris']);
            $table->enum('severity_level', ['low', 'medium', 'high']);
            $table->text('description')->nullable();
            $table->string('photo_path')->nullable();        // Local disk path
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_incidents');
    }
};
