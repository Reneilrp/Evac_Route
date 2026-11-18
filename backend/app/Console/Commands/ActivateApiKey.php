<?php

namespace App\Console\Commands;

use App\Models\ApiKey;
use Illuminate\Console\Command;

class ActivateApiKey extends Command
{
    protected $signature = 'api-key:activate {id : The ID of the API key to reactivate}';
    protected $description = 'Reactivate a previously revoked API key';

    public function handle(): int
    {
        $id = $this->argument('id');
        $key = ApiKey::find($id);

        if (! $key) {
            $this->error("API key with ID [{$id}] not found.");
            return Command::FAILURE;
        }

        $key->update(['is_active' => true]);
        $this->info("✅ API Key #{$key->id} for [{$key->name}] has been REACTIVATED.");

        return Command::SUCCESS;
    }
}
