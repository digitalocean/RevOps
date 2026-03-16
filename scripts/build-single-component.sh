#!/usr/bin/env bash
# Build frontend and copy to backend/public so one Node process can serve both (no /api routing needed).
set -e
cd "$(dirname "$0")/.."
echo "Building frontend (Helm)..."
cd Helm
npm ci
npm run build
echo "Installing backend deps and copying frontend..."
cd ../backend
npm ci
mkdir -p public
cp -r ../Helm/dist/* public/
echo "Single-component build done. backend/public has the frontend."
