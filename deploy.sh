#!/usr/bin/env bash
# ==============================================================================
# Smart One-Command Deploy Script for Evac_Route
# Usage: ./deploy.sh
# What it does:
#  1. Builds frontend web production bundle (dist/)
#  2. SSH into VM -> pulls latest backend git changes
#  3. Smart check:
#     - If backend is "Already up to date": skips composer & migration overhead
#     - If composer.lock changed: runs composer install automatically
#  4. Rsyncs fresh dist/ to VM with --delete
#  5. Restarts background workers
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

# 2. Pull Git Backend Changes on VM with Smart Detection
echo ""
echo "📥 [2/4] Pulling latest backend Git changes on VM..."
ssh "$VM_HOST" << 'EOF'
cd /var/www/evac_route
PULL_OUTPUT=$(git pull origin main)
echo "$PULL_OUTPUT"

cd backend
if [[ "$PULL_OUTPUT" == *"Already up to date."* ]]; then
    echo "⚡ Backend code is already up-to-date. Skipping composer & migrations."
else
    # Check if composer.lock was modified in the new commits
    if git diff --name-only HEAD@{1} HEAD | grep -q "composer.lock"; then
        echo "📦 composer.lock changed. Running composer install..."
        composer install --no-dev --optimize-autoloader
    else
        echo "⏩ No new PHP packages. Skipping composer install."
    fi

    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan migrate --force
fi
EOF

# 3. Rsync Dist Folder to VM (compressed, fast, and deletes old unused chunks)
echo ""
echo "📤 [3/4] Rsyncing fresh dist/ bundle to VM..."
rsync -avz --delete "$PROJECT_ROOT/frontend/Evac_RouteWeb/dist/" "$VM_HOST:$REMOTE_PATH/frontend/Evac_RouteWeb/dist/"
echo "✅ Frontend dist synced."

# 4. Restart Supervisor Workers
echo ""
echo "⚡ [4/4] Restarting background workers on VM..."
ssh "$VM_HOST" "sudo supervisorctl restart evac-reverb evac-queue || true"

echo ""
echo "=========================================================="
echo "🎉 Evac_Route deployment complete! Live at: https://evacroute.app"
echo "=========================================================="
