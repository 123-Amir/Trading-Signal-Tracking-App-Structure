# Trading Signal Tracker - Setup Script for Windows

Write-Host "Trading Signal Tracker - Setup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Error: Node.js is not installed. Please install Node.js 18+ and try again." -ForegroundColor Red
  exit 1
}

# Check for npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "Error: npm is not installed. Please install npm and try again." -ForegroundColor Red
  exit 1
}

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
  Write-Host "Error: npm install failed." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy .env.example to .env"
Write-Host "2. Choose one of these options:"
Write-Host ""
Write-Host "   Option A (with Docker):" -ForegroundColor Yellow
Write-Host "     docker compose up -d"
Write-Host "     npm start"
Write-Host "     npm run dev"
Write-Host ""
Write-Host "   Option B (without Docker):" -ForegroundColor Yellow
Write-Host "     1. Ensure PostgreSQL is running locally"
Write-Host "     2. createdb -U postgres signal_tracker"
Write-Host "     3. psql -U postgres signal_tracker < db/init.sql"
Write-Host "     4. npm start"
Write-Host "     5. npm run dev"
Write-Host ""
Write-Host "Then open http://localhost:5173 in your browser." -ForegroundColor Green
