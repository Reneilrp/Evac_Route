#!/usr/bin/env bash
# Evac_Route Environment Switcher (dev | prod)

TARGET=$1

if [ "$TARGET" != "dev" ] && [ "$TARGET" != "prod" ]; then
    echo "Usage: ./set-env.sh [dev|prod]"
    echo "  dev  : Switch backend, web, and mobile to local development (.env.development)"
    echo "  prod : Switch backend, web, and mobile to live production (.env.production - https://evacroute.app)"
    exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$TARGET" == "dev" ]; then
    echo "🔄 Switching Evac_Route to [DEVELOPMENT] (localhost / 10.0.2.2)..."
    cp "$DIR/backend/.env.development" "$DIR/backend/.env"
    cp "$DIR/frontend/Evac_RouteWeb/.env.development" "$DIR/frontend/Evac_RouteWeb/.env"
    cp "$DIR/frontend/Evac_RouteMobile/.env.development" "$DIR/frontend/Evac_RouteMobile/.env"
    echo "✅ Switched all modules to DEVELOPMENT!"
else
    echo "🚀 Switching Evac_Route to [PRODUCTION] (https://evacroute.app)..."
    cp "$DIR/backend/.env.production" "$DIR/backend/.env"
    cp "$DIR/frontend/Evac_RouteWeb/.env.production" "$DIR/frontend/Evac_RouteWeb/.env"
    cp "$DIR/frontend/Evac_RouteMobile/.env.production" "$DIR/frontend/Evac_RouteMobile/.env"
    echo "✅ Switched all modules to PRODUCTION (https://evacroute.app)!"
fi
