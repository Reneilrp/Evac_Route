param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev","prod")]
    [string]$Target
)

$RootDir = $PSScriptRoot

if ($Target -eq "dev") {
    Write-Host "🔄 Switching Evac_Route to [DEVELOPMENT] (localhost / 10.0.2.2)..." -ForegroundColor Yellow
    Copy-Item "$RootDir\backend\.env.development" "$RootDir\backend\.env" -Force
    Copy-Item "$RootDir\frontend\Evac_RouteWeb\.env.development" "$RootDir\frontend\Evac_RouteWeb\.env" -Force
    Copy-Item "$RootDir\frontend\Evac_RouteMobile\.env.development" "$RootDir\frontend\Evac_RouteMobile\.env" -Force
    Write-Host "✅ Switched all modules to DEVELOPMENT!" -ForegroundColor Green
} else {
    Write-Host "🚀 Switching Evac_Route to [PRODUCTION] (https://evacroute.app)..." -ForegroundColor Cyan
    Copy-Item "$RootDir\backend\.env.production" "$RootDir\backend\.env" -Force
    Copy-Item "$RootDir\frontend\Evac_RouteWeb\.env.production" "$RootDir\frontend\Evac_RouteWeb\.env" -Force
    Copy-Item "$RootDir\frontend\Evac_RouteMobile\.env.production" "$RootDir\frontend\Evac_RouteMobile\.env" -Force
    Write-Host "✅ Switched all modules to PRODUCTION (https://evacroute.app)!" -ForegroundColor Green
}
