#!/bin/bash
# =============================================================================
# To-DO (Meridian) — Start both backend and frontend
# Run: bash start.sh   (from inside the agileops/ folder)
# =============================================================================

# Always resolve to the directory this script lives in
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🚀 Starting To-DO (Meridian)..."
echo ""

# Check .env exists
if [ ! -f "$ROOT_DIR/backend/.env" ]; then
  echo "⚠️  backend/.env not found. Running setup first..."
  bash "$ROOT_DIR/setup.sh"
fi

# Kill any existing processes on the ports
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend in background (always from ROOT_DIR)
echo "▶ Starting backend on http://localhost:4000..."
cd "$ROOT_DIR/backend" && npm start &
BACKEND_PID=$!
sleep 2

# Trap ctrl-c to kill backend too
trap "kill $BACKEND_PID 2>/dev/null; exit" INT TERM

# Start frontend
echo "▶ Starting frontend on http://localhost:5173..."
echo ""
echo "  App: http://localhost:5173"
echo "  API: http://localhost:4000"
echo ""
echo "  Press Ctrl+C to stop everything"
echo ""

cd "$ROOT_DIR/Helm" && npm run dev
