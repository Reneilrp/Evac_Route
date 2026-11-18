<?php

namespace App\Console\Commands;

use App\Models\ApiKeyLog;
use Illuminate\Console\Command;

class ShowApiKeyLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'api-key:logs {--limit=25 : Number of recent requests to display}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Display recent external API key access logs and request telemetry';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $limit = (int) $this->option('limit');
        $logs = ApiKeyLog::with('apiKey')->orderByDesc('id')->limit($limit)->get();

        if ($logs->isEmpty()) {
            $this->warn('No API key request logs found yet.');
            return Command::SUCCESS;
        }

        $headers = ['Time', 'Partner Key Name', 'Method', 'Endpoint', 'Status', 'Latency', 'IP Address', 'Client'];

        $rows = $logs->map(function (ApiKeyLog $l) {
            $status = match (true) {
                $l->status_code >= 200 && $l->status_code < 300 => "<fg=green>{$l->status_code} OK</>",
                $l->status_code === 401 => "<fg=red;options=bold>401 UNAUTHORIZED</>",
                $l->status_code === 404 => "<fg=yellow>404 NOT FOUND</>",
                default => "<fg=gray>{$l->status_code}</>",
            };

            return [
                $l->created_at->format('M d H:i:s'),
                $l->key_name ?: 'Unknown',
                $l->method,
                $l->endpoint,
                $status,
                $l->duration_ms ? "{$l->duration_ms}ms" : '—',
                $l->ip_address,
                \Illuminate\Support\Str::limit($l->user_agent, 25),
            ];
        });

        $this->info('==================================================================================================');
        $this->info("  📜 RECENT PARTNER API KEY ACCESS LOGS (Last {$logs->count()} Requests)");
        $this->info('==================================================================================================');
        $this->table($headers, $rows);

        return Command::SUCCESS;
    }
}
