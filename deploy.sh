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
VM_HOST="evac-server"
REMOTE_PATH="/var/www/evac_route"

echo "=========================================================="
echo "🚀 Deploying Evac_Route -> https://evacroute.app"
echo "=========================================================="

# 1. Build Frontend Web
echo ""
echo "📦 [1/4] Building Frontend Web (dist)..."
cd "$PROJECT_ROOT/frontend/web"
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
    echo "⚡ Backend code is already up-to-date. Checking for pending migrations..."
    php artisan migrate --force
    sudo chown -R www-data:www-data /var/www/evac_route/backend/storage /var/www/evac_route/backend/bootstrap/cache || true
    sudo chmod -R 775 /var/www/evac_route/backend/storage /var/www/evac_route/backend/bootstrap/cache || true
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
    sudo chown -R www-data:www-data /var/www/evac_route/backend/storage /var/www/evac_route/backend/bootstrap/cache || true
    sudo chmod -R 775 /var/www/evac_route/backend/storage /var/www/evac_route/backend/bootstrap/cache || true
fi
EOF

# 3. Rsync Dist Folder to VM (compressed, fast, and deletes old unused chunks)
echo ""
echo "📤 [3/4] Rsyncing fresh dist/ bundle to VM..."
ssh "$VM_HOST" "mkdir -p $REMOTE_PATH/frontend/web"
rsync -avz --delete "$PROJECT_ROOT/frontend/web/dist/" "$VM_HOST:$REMOTE_PATH/frontend/web/dist/"
# Maintain backwards-compatible symlink so remote Nginx serves properly regardless of web or Evac_RouteWeb root
ssh "$VM_HOST" "ln -sfn $REMOTE_PATH/frontend/web $REMOTE_PATH/frontend/Evac_RouteWeb 2>/dev/null || true"
echo "✅ Frontend dist synced."

# 4. Restart Supervisor Workers & PHP-FPM
echo ""
echo "⚡ [4/4] Restarting background workers & reloading PHP-FPM on VM..."
ssh "$VM_HOST" "sudo supervisorctl restart evac-reverb evac-queue || true; sudo systemctl reload php8.3-fpm nginx || true"

echo ""
echo "=========================================================="
echo "🎉 Evac_Route deployment complete! Live at: https://evacroute.app"
echo "=========================================================="
