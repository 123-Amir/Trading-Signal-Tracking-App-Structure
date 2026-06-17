# Trading Signal Tracker

A React + Express project for tracking trading signals with live Binance price updates and PostgreSQL persistence.

## Features

- Signal creation form with validation
- Dashboard table with live Binance prices
- Dynamic status calculation for BUY/SELL signals
- ROI calculation shown to 2 decimal places
- Auto-refresh every 15 seconds
- PostgreSQL data storage via Docker Compose
- Backend API for signals and live status

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm
- Docker Desktop (optional, for PostgreSQL)

### Option 1: With Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone (https://github.com/123-Amir/Trading-Signal-Tracking-App-Structure.git)
   cd project
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start PostgreSQL and Adminer using Docker Compose:
   ```bash
   docker compose up -d
   ```
   If Docker is not running, start Docker Desktop first.

4. Start the backend server:
   ```bash
   npm start
   ```
5. Start the frontend app (in a new terminal):
   ```bash
   npm run dev
   ```
6. Open the app at `http://localhost:5173`.

### Option 2: Without Docker (Use Local PostgreSQL)

1. Install PostgreSQL 16+ locally and ensure it's running.
2. Clone and install:
   ```bash
   git clone <repo-url>
   cd project
   npm install
   ```
3. Create a database:
   ```bash
   createdb -U postgres signal_tracker
   ```
4. Import the schema:
   ```bash
   psql -U postgres signal_tracker < db/init.sql
   ```
5. Start the backend:
   ```bash
   npm start
   ```
6. Start the frontend (new terminal):
   ```bash
   npm run dev
   ```
7. Open `http://localhost:5173`.

### Docker Troubleshooting

- **Docker Desktop not running:** Start Docker Desktop from your applications.
- **Image pull error:** Ensure you have internet connection and Docker Desktop is fully running.
- **Port in use:** If port 5432 or 8080 is already in use, modify `docker-compose.yml` port mappings.
- **Stop containers:** Use `docker compose down` to stop and remove containers.

### Environment variables

Create a `.env` file in the project root with:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/signal_tracker
```

## Database Setup

The project uses PostgreSQL. Docker Compose initializes the `signals` table automatically.

### Accessing the database

- Adminer is available at `http://localhost:8080`
- Use the credentials:
  - System: PostgreSQL
  - Server: db
  - Username: postgres
  - Password: postgres
  - Database: signal_tracker

### Table structure

`signals` table columns:

- `id` UUID primary key
- `symbol` TEXT
- `direction` TEXT (`BUY`, `SELL`)
- `entry_price` NUMERIC
- `stop_loss` NUMERIC
- `target_price` NUMERIC
- `entry_time` TIMESTAMPTZ
- `expiry_time` TIMESTAMPTZ
- `status` TEXT
- `realized_roi` NUMERIC
- `created_at` TIMESTAMPTZ

## API Documentation

### POST /api/signals

Create a new signal.

Request body:
```json
{
  "symbol": "BTCUSDT",
  "direction": "BUY",
  "entryPrice": 30000,
  "stopLoss": 29500,
  "targetPrice": 31000,
  "entryTime": "2026-06-17T10:00:00.000Z",
  "expiryTime": "2026-06-17T12:00:00.000Z"
}
```

Response: `201 Created`

### GET /api/signals

List all saved signals.

### GET /api/signals/:id

Get a specific signal by ID.

### DELETE /api/signals/:id

Delete a signal by ID.

### GET /api/signals/:id/status

Fetch live status, current Binance price, and ROI for a signal.

Response example:
```json
{
  "id": "...",
  "status": "OPEN",
  "currentPrice": 30550.23,
  "roi": 1.83
}
```

## Architecture Explanation

- `server.js` implements the Express backend.
- `src/` contains React components and utility functions.
- `src/CreateSignal.tsx` has the signal creation form.
- `src/Dashboard.tsx` renders the live signal dashboard.
- `src/utils.ts` contains API calls, validation, and formatting helpers.
- `docker-compose.yml` launches PostgreSQL and Adminer.
- `db/init.sql` defines the database table.

The frontend proxies API requests to the backend via Vite.
Live price status is calculated from Binance and joined to saved signal details.

## Project Folder Structure

```
project/
├─ db/
│  └─ init.sql
├─ dist/
├─ node_modules/
├─ public/
├─ src/
│  ├─ App.tsx
│  ├─ CreateSignal.tsx
│  ├─ Dashboard.tsx
│  ├─ index.css
│  ├─ main.tsx
│  ├─ types.ts
│  └─ utils.ts
├─ .env
├─ .gitignore
├─ docker-compose.yml
├─ package.json
├─ README.md
├─ server.js
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
```

## Testing Checklist

- [ ] Create a BUY signal and confirm it saves successfully.
- [ ] Create a SELL signal and confirm it saves successfully.
- [ ] Verify the dashboard displays current price for BTCUSDT or ETHUSDT.
- [ ] Confirm a BUY signal becomes `TARGET HIT` when current price exceeds target.
- [ ] Confirm a BUY signal becomes `STOP LOSS HIT` when current price drops below stop loss.
- [ ] Confirm a SELL signal becomes `TARGET HIT` when current price goes below target.
- [ ] Confirm a SELL signal becomes `STOP LOSS HIT` when current price goes above stop loss.
- [ ] Verify an expired signal shows `Expired` in the time remaining field and `EXPIRED` status.
- [ ] Verify ROI calculation on the dashboard matches expected formula to 2 decimals.
- [ ] Confirm dashboard refreshes automatically every 15 seconds.
- [ ] Confirm form validation prevents invalid numeric inputs and invalid symbol format.
- [ ] Confirm API endpoints return meaningful error messages on bad input.

## Recruiter Run Instructions

**With Docker (easiest):**
1. Install dependencies: `npm install`
2. Start Docker Desktop
3. Start services: `docker compose up -d`
4. Start backend: `npm start` (new terminal)
5. Start frontend: `npm run dev` (another terminal)
6. Open `http://localhost:5173`

**Without Docker:**
1. Install PostgreSQL locally and ensure it's running
2. Install dependencies: `npm install`
3. Create database: `createdb -U postgres signal_tracker`
4. Import schema: `psql -U postgres signal_tracker < db/init.sql`
5. Start backend: `npm start` (new terminal)
6. Start frontend: `npm run dev` (another terminal)
7. Open `http://localhost:5173`

---

For testing without Docker, set `DATABASE_URL` to an existing PostgreSQL instance and run `npm start`.
