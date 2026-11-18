<?php

namespace App\Console\Commands;

use App\Models\ApiKey;
use Illuminate\Console\Command;

class ListApiKeys extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'api-key:list';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'List all generated API keys, their status, request counts, and last usage';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $keys = ApiKey::orderByDesc('created_at')->get();

        if ($keys->isEmpty()) {
            $this->warn('No API keys have been generated yet. Use: php artisan api-key:generate');
            return Command::SUCCESS;
        }

        $headers = ['ID', 'Partner / Name', 'Key Preview', 'Status', 'Requests', 'Last Used', 'Last IP', 'Expires At'];

        $rows = $keys->map(function (ApiKey $k) {
            $status = match ($k->status_label) {
                'active' => '<fg=green;options=bold>ACTIVE</>',
                'expired' => '<fg=yellow;options=bold>EXPIRED</>',
                'revoked' => '<fg=red;options=bold>REVOKED</>',
                default => $k->status_label,
            };

            $lastUsed = $k->last_used_at ? $k->last_used_at->diffForHumans() : '<fg=gray>Never</>';
            $lastIp = $k->last_ip ?: '<fg=gray>—</>';
            $expires = $k->expires_at ? $k->expires_at->toFormattedDateString() : '<fg=gray>No Expiration</>';

            return [
                $k->id,
                $k->name,
                $k->masked_key,
                $status,
                number_format($k->requests_count),
                $lastUsed,
                $lastIp,
                $expires,
            ];
        });

        $this->info('========================================================================================');
        $this->info('  🔑 GENERATED SHELTERS API KEYS & TRAFFIC MONITORING');
        $this->info('========================================================================================');
        $this->table($headers, $rows);
        $this->info("Total Keys: {$keys->count()} | Active: {$keys->where('is_active', true)->count()} | Total Requests Served: " . number_format($keys->sum('requests_count')));
        $this->line('Commands available:');
        $this->line('  • Generate: <comment>php artisan api-key:generate "Name"</comment>');
        $this->line('  • Revoke:   <comment>php artisan api-key:revoke {id}</comment>');
        $this->line('  • Activate: <comment>php artisan api-key:activate {id}</comment>');

        return Command::SUCCESS;
    }
}
