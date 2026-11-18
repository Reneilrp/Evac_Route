<?php

namespace App\Console\Commands;

use App\Models\ApiKey;
use Illuminate\Console\Command;

class RevokeApiKey extends Command
{
    protected $signature = 'api-key:revoke {id : The ID of the API key to revoke}';
    protected $description = 'Revoke (deactivate) an existing API key immediately';

    public function handle(): int
    {
        $id = $this->argument('id');
        $key = ApiKey::find($id);

        if (! $key) {
            $this->error("API key with ID [{$id}] not found.");
            return Command::FAILURE;
        }

        $key->update(['is_active' => false]);
        $this->info("✅ API Key #{$key->id} for [{$key->name}] has been REVOKED. Access blocked.");

        return Command::SUCCESS;
    }
}
