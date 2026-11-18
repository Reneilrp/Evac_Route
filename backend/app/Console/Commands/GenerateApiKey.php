<?php

namespace App\Console\Commands;

use App\Models\ApiKey;
use Illuminate\Console\Command;

class GenerateApiKey extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'api-key:generate 
                            {name? : The friendly name or organization assigned to this key}
                            {--days= : Optional expiration duration in days}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate a new API key for external partner projects to access the Shelters API';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $name = $this->argument('name') ?: $this->ask('Enter the partner project / organization name', 'External Partner');
        $days = $this->option('days');
        $expiresAt = $days ? now()->addDays((int) $days) : null;

        $keyRecord = ApiKey::generate($name, $expiresAt);

        $this->info('========================================================');
        $this->info('  🎉 NEW API KEY CREATED FOR SHELTERS ACCESS');
        $this->info('========================================================');
        $this->line("Partner Name:  <comment>{$keyRecord->name}</comment>");
        $this->line("API Key:       <fg=green;options=bold>{$keyRecord->key}</>");
        $this->line('Expires At:    ' . ($keyRecord->expires_at ? $keyRecord->expires_at->toDateTimeString() : '<comment>Never (No Expiration)</comment>'));
        $this->info('--------------------------------------------------------');
        $this->line('Usage for other projects:');
        $this->line("  Header:       <comment>X-API-KEY: {$keyRecord->key}</comment>");
        $this->line("  Query Param:  <comment>?api_key={$keyRecord->key}</comment>");
        $this->info('========================================================');

        return Command::SUCCESS;
    }
}
