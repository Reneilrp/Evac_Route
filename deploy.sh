#!/usr/bin/env bash
# ==============================================================================
# One-Command Deploy Script for Evac_Route
# Usage: ./deploy.sh
# What it does:
#  1. Builds frontend web production bundle (dist/)
#  2. SSH into VM -> pulls latest backend git changes (backend only)
#  3. Rsync fresh dist/ to /var/www/evac_route/frontend/Evac_RouteWeb/dist/
#  4. Runs migrations and optimizes Laravel
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VM_HOST="thesis"
REMOTE_PATH="/var/www/evac_route"

echo "=========================================================="
echo "🚀 Deploying Evac_Route -> https://evacroute.app"
echo "=========================================================="

# 1. Build Frontend Web
echo ""
echo "📦 [1/4] Building Frontend Web (dist)..."
cd "$PROJECT_ROOT/frontend/Evac_RouteWeb"
npm run build
echo "✅ Build completed successfully."

# 2. Pull Git Backend Changes on VM
echo ""
echo "📥 [2/4] Pulling latest Git changes on VM..."
ssh "$VM_HOST" "cd $REMOTE_PATH && git pull origin main"

# 3. Rsync Dist Folder to VM (compressed, fast, and deletes old unused chunks)
echo ""
echo "📤 [3/4] Rsyncing fresh dist/ bundle to VM..."
rsync -avz --delete "$PROJECT_ROOT/frontend/Evac_RouteWeb/dist/" "$VM_HOST:$REMOTE_PATH/frontend/Evac_RouteWeb/dist/"
echo "✅ Frontend dist synced."

# 4. Run Laravel Optimizations & Migrations on VM
echo ""
echo "⚡ [4/4] Optimizing Laravel Backend on VM..."
ssh "$VM_HOST" << 'EOF'
cd /var/www/evac_route/backend
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
sudo supervisorctl restart evac-reverb evac-queue || true
EOF

echo ""
echo "=========================================================="
echo "🎉 Evac_Route deployment complete! Live at: https://evacroute.app"
echo "=========================================================="
