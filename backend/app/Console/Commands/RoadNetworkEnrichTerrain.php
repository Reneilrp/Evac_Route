<?php

namespace App\Console\Commands;

use App\Models\RoadEdge;
use App\Models\RoadNode;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class RoadNetworkEnrichTerrain extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:road-network-enrich-terrain {--mock : Skip API queries and simulate elevation data}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Enriches road nodes and edges with elevation data, calculated slopes, and susceptibility metrics';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $token = env('MAPBOX_TOKEN');
        $useMock = $this->option('mock') || empty($token);

        if (empty($token)) {
            $this->warn('MAPBOX_TOKEN is not set in the .env file. Falling back to mock simulation mode.');
        } else {
            $this->info('Mapbox Token detected. Starting terrain enrichment...');
        }

        $nodes = RoadNode::all();
        $totalNodes = $nodes->count();

        if ($totalNodes === 0) {
            $this->error('No road nodes found in the database. Please seed the database first.');

            return 1;
        }

        $this->info("Processing {$totalNodes} road nodes...");

        $progressBar = $this->output->createProgressBar($totalNodes);
        $progressBar->start();

        foreach ($nodes as $node) {
            $elevation = 0.00;

            if ($useMock) {
                // Simulate Zamboanga City topography:
                // Flat basin near Tetuan/Tugbungan (east, low lat), rising towards the hills/mountains in the north-west (Baliwasan/San Jose)
                // We use lat/lng mapping to generate a natural slope
                $latFactor = ($node->lat - 6.90) * 100; // e.g. 6.9185 -> 1.85
                $lngFactor = ($node->lng - 122.00) * 10; // e.g. 122.0882 -> 0.882

                // Base elevation of 3 meters, plus altitude gain towards the north-west, plus some noise
                $elevation = 3.0 + ($latFactor * 4.5) + (5.0 / max(0.1, $lngFactor)) + sin($node->lat * 1000) * 2;
                if ($elevation < 1.0) {
                    $elevation = 1.0;
                }
            } else {
                try {
                    // Call Mapbox Tilequery API (contour layer) to fetch elevation
                    $response = Http::timeout(5)->get("https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/{$node->lng},{$node->lat}.json", [
                        'layers' => 'contour',
                        'limit' => 20,
                        'access_token' => $token,
                    ]);

                    if ($response->successful()) {
                        $geojson = $response->json();
                        $features = $geojson['features'] ?? [];

                        if (count($features) > 0) {
                            $maxEle = 0;
                            foreach ($features as $feature) {
                                $ele = $feature['properties']['ele'] ?? 0;
                                if ($ele > $maxEle) {
                                    $maxEle = $ele;
                                }
                            }
                            $elevation = (float) $maxEle;
                        } else {
                            // Default to flat lowlands if contour not returned
                            $elevation = 2.50;
                        }
                    } else {
                        // API fail fallback
                        $elevation = 4.00;
                    }
                } catch (\Exception $e) {
                    $elevation = 4.00;
                }

                // Rate-limit safety: sleep 100ms (10 queries per second max)
                usleep(100000);
            }

            $node->update(['elevation_meters' => $elevation]);
            $progressBar->advance();
        }

        $progressBar->finish();
        $this->info("\nAll nodes updated with elevation data!");

        // Phase 2: Edges Slope & Susceptibility calculation
        $edges = RoadEdge::all();
        $totalEdges = $edges->count();
        $this->info("Processing {$totalEdges} road edges for slope and risk classification...");

        $progressBarEdges = $this->output->createProgressBar($totalEdges);
        $progressBarEdges->start();

        foreach ($edges as $edge) {
            $source = RoadNode::find($edge->source_node_id);
            $target = RoadNode::find($edge->target_node_id);

            if (! $source || ! $target) {
                $progressBarEdges->advance();

                continue;
            }

            // Calculate height difference
            $heightDiff = abs($source->elevation_meters - $target->elevation_meters);
            $distance = (float) $edge->distance_meters;

            $slopeDeg = 0.00;
            if ($distance > 0) {
                $ratio = $heightDiff / $distance;
                if ($ratio > 1) {
                    $ratio = 1.0;
                } // clamp to prevent asin error

                $slopeRad = asin($ratio);
                $slopeDeg = rad2deg($slopeRad);
            }

            $minElevation = min($source->elevation_meters, $target->elevation_meters);

            // Determine Flood Susceptibility: Low-lying and flat roads
            $floodSusceptibility = 'none';
            if ($minElevation < 4.0 && $slopeDeg < 1.0) {
                $floodSusceptibility = 'high';
            } elseif ($minElevation < 8.0 && $slopeDeg < 2.0) {
                $floodSusceptibility = 'medium';
            } elseif ($minElevation < 12.0 && $slopeDeg < 3.5) {
                $floodSusceptibility = 'low';
            }

            // Determine Landslide Susceptibility: Steep roads (cliffs/mountains)
            $landslideSusceptibility = 'none';
            if ($slopeDeg > 25.0) {
                $landslideSusceptibility = 'high';
            } elseif ($slopeDeg > 15.0) {
                $landslideSusceptibility = 'medium';
            } elseif ($slopeDeg > 8.0) {
                $landslideSusceptibility = 'low';
            }

            $edge->update([
                'slope_degrees' => $slopeDeg,
                'min_elevation_meters' => $minElevation,
                'flood_susceptibility' => $floodSusceptibility,
                'landslide_susceptibility' => $landslideSusceptibility,
            ]);

            $progressBarEdges->advance();
        }

        $progressBarEdges->finish();
        $this->info("\nRoad network terrain enrichment complete!");

        return 0;
    }
}
