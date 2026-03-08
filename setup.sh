#!/bin/bash
# =============================================================================
# To-DO (Meridian) — Local Setup Script
# Run: bash setup.sh   (from inside the agileops/ folder)
# =============================================================================
set -e

# Always resolve to the directory this script lives in
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║         To-DO (Meridian) — Setup Script          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. Check prerequisites ─────────────────────────────────────────────────
echo "▶ Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "❌ Node.js is not installed. Install from https://nodejs.org (v18+ required)"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js v18+ required (you have $(node -v))"
  exit 1
fi
echo "   ✅ Node.js $(node -v)"

if ! command -v psql &>/dev/null; then
  echo "❌ PostgreSQL not found. Install via Homebrew: brew install postgresql@16"
  exit 1
fi
echo "   ✅ PostgreSQL found"

# ── 2. Configure database ──────────────────────────────────────────────────
echo ""
echo "▶ Setting up PostgreSQL database..."

DB_USER="${PGUSER:-$(whoami)}"
DB_NAME="meridian"
DB_HOST="localhost"
DB_PORT="5432"

# Start postgres if not running (Homebrew)
if command -v brew &>/dev/null; then
  if ! pg_isready -q 2>/dev/null; then
    echo "   Starting PostgreSQL via Homebrew..."
    brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null || true
    sleep 2
  fi
fi

# Create database if it doesn't exist
psql -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
echo "   ✅ Database '$DB_NAME' ready"

# ── 3. Create backend/.env ────────────────────────────────────────────────
echo ""
echo "▶ Configuring environment..."

BACKEND_ENV="backend/.env"
if [ ! -f "$BACKEND_ENV" ]; then
  cat > "$BACKEND_ENV" << EOF
DATABASE_URL=postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}
SESSION_SECRET=meridian-local-secret-change-in-prod-$(openssl rand -hex 12)
NODE_ENV=development
PORT=4000
EOF
  echo "   ✅ Created backend/.env"
else
  echo "   ℹ️  backend/.env already exists (skipping)"
fi

# ── 4. Run database schema ────────────────────────────────────────────────
echo ""
echo "▶ Running database schema migrations..."
psql -U "$DB_USER" -d "$DB_NAME" -f backend/scripts/schema.sql > /dev/null 2>&1 && \
  echo "   ✅ Schema applied" || \
  echo "   ⚠️  Schema may have already been applied (safe to continue)"

# ── 5. Install backend deps ───────────────────────────────────────────────
echo ""
echo "▶ Installing backend dependencies..."
cd backend && npm install --quiet && cd ..
echo "   ✅ Backend dependencies installed"

# ── 6. Install frontend deps ──────────────────────────────────────────────
echo ""
echo "▶ Installing frontend dependencies..."
cd Helm && npm install --quiet && cd ..
echo "   ✅ Frontend dependencies installed"

# ── 7. Done ───────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║               ✅ Setup Complete!                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  To start the app, run in two terminals:"
echo ""
echo "  Terminal 1 (Backend):"
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  cd backend && npm start                     │"
echo "  │  → http://localhost:4000                     │"
echo "  └─────────────────────────────────────────────┘"
echo ""
echo "  Terminal 2 (Frontend):"
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  cd Helm && npm run dev                      │"
echo "  │  → http://localhost:5173                     │"
echo "  └─────────────────────────────────────────────┘"
echo ""
echo "  Or use the start.sh script to launch both at once:"
echo "  bash start.sh"
echo ""
