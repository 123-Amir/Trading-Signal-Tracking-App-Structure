#!/bin/bash

echo "Trading Signal Tracker - Setup Script"
echo "======================================"
echo ""

if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js 18+ and try again."
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "Error: npm is not installed. Please install npm and try again."
  exit 1
fi

echo "Installing dependencies..."
npm install

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env"
echo "2. Choose one of these options:"
echo ""
echo "   Option A (with Docker):"
echo "     docker compose up -d"
echo "     npm start"
echo "     npm run dev"
echo ""
echo "   Option B (without Docker):"
echo "     createdb -U postgres signal_tracker"
echo "     psql -U postgres signal_tracker < db/init.sql"
echo "     npm start"
echo "     npm run dev"
echo ""
echo "Then open http://localhost:5173 in your browser."
