# Command Center (Node + TypeScript)

A full-stack Command Center platform for radio/mesh devices built with NestJS, Prisma, React, and Socket.IO. The system delivers real-time node telemetry, command orchestration, inventory tracking, and rich UI workflows implemented entirely in Node.js/TypeScript (no Python).

## Tech Stack

- **Backend:** NestJS, Prisma (PostgreSQL), Socket.IO, `@serialport/*`, Pino logging
- **Frontend:** React (Vite), React Router, Zustand, React Query, Leaflet (map placeholder)
- **Tooling:** pnpm workspaces, TypeScript strict mode, ESLint + Prettier, ts-node-dev

## Repository Layout

```
apps/
  backend/      # NestJS API, WebSocket gateway, serial worker, Prisma schema
  frontend/     # React SPA (Vite) with layout + routing skeleton
pnpm-workspace.yaml
tsconfig.base.json
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL instance (local Docker or managed service)

### Platform Setup Guides

#### Linux (Debian/Ubuntu example)

```bash
# 1. System packages (build tools, serial, git, postgres client)
sudo apt update
sudo apt install -y curl git build-essential pkg-config libssl-dev \
    python3 make gcc g++ postgresql-client

# 2. Node.js 20 (via corepack + NodeSource or nvm)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. pnpm (ships with corepack in Node 20)
sudo corepack enable
corepack prepare pnpm@latest --activate

# 4. Clone repo + install deps
git clone https://github.com/TheRealSirHaXalot/AntiHunter-Command-Control-PRO.git
cd AntiHunter-Command-Control-PRO
pnpm install

# 5. Serial access (add user to dialout; requires re-login)
sudo usermod -aG dialout "$USER"
```

For PostgreSQL you can either install locally (`sudo apt install postgresql`) or run a Docker container:

```bash
docker run --name command-center-postgres \
  -e POSTGRES_PASSWORD=commandcenter \
  -p 5432:5432 \
  -d postgres:16
```

#### Windows 10/11 (PowerShell)

```powershell
# 1. Install Node.js 20+ (https://nodejs.org/en/download)
#    During setup, enable "Automatically install necessary tools".

# 2. Enable pnpm via corepack (run in new PowerShell window)
corepack enable
corepack prepare pnpm@latest --activate

# 3. Clone repository
git clone https://github.com/TheRealSirHaXalot/AntiHunter-Command-Control-PRO.git
cd AntiHunter-Command-Control-PRO

# 4. Install dependencies
pnpm install

# 5. PostgreSQL options:
#    - Install from https://www.postgresql.org/download/windows/
#    - or use Docker Desktop: docker run ... (same as Linux command above)

# 6. Serial access
#    - Confirm the USB/COM port appears (Device Manager -> Ports (COM & LPT))
#    - Use the COM port name (e.g., COM5) in the backend .env
```

> **Tip:** For Windows developers using WSL2, follow the Linux instructions inside WSL. When accessing a Windows USB/serial device from WSL, use `netsh wsl --help` to configure USBIP or run the backend on Windows and frontend tooling in WSL.

### Install Dependencies

```bash
pnpm install
```

### Environment Variables

Create `apps/backend/.env` with at least:

```
DATABASE_URL="postgresql://user:password@localhost:5432/command_center"
PORT=3000
HTTP_PREFIX=api
LOG_LEVEL=info
SERIAL_DEVICE=/dev/ttyUSB0   # optional until connect step
SERIAL_BAUD=115200
```

Adjust serial settings to match your hardware. Leave `SERIAL_DEVICE` unset if you only need API/UI development.

### Database Setup

Run migrations and seed defaults (AppConfig, AlarmConfig, Coverage, default Site):

```bash
cd apps/backend
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### Development Servers

Sequential terminals:

```bash
# Backend (NestJS + Socket.IO)
cd apps/backend
pnpm dev

# Frontend (Vite)
cd apps/frontend
pnpm dev
```

Vite proxies `/api`, `/healthz`, `/readyz`, `/metrics` to the backend (default `http://localhost:3000`).

## Backend Highlights

- Global configuration via `@nestjs/config` + Zod validation
- Pino logger with pretty transport in non-production environments
- Serial service (`SerialService`) with connect/disconnect/command queue scaffolding
- WebSocket gateway streaming `init`, `nodes`, `event`, and accepting `sendCommand`
- Prisma schema implementing:
  - Core domain models (nodes, targets, inventory, commands, audits, OUI cache)
  - Config tables (app, alarms, visuals, coverage)
  - Multi-site federation (Site, SerialConfig, MqttConfig)
  - User preferences and RBAC-ready user model
- `prisma/seed.ts` ensures singleton config rows and a default site

## Frontend Highlights

- Responsive app shell with header, navigation sidebar, main content, and terminal drawer
- Route placeholders for Map, Targets, Inventory, Command Console, Config, and Exports
- Socket bridge wiring backend events into Zustand stores (nodes + terminal)
- Global styling foundation (dark theme, control chips, panels) ready for Leaflet integration
- Providers for React Query and Socket.IO client, ready for data fetching

## Next Implementation Steps

1. Implement actual Prisma migrations (`prisma migrate dev`) once the database is available and validate schema integrity.
2. Flesh out API modules (targets, inventory, exports, auth) with Prisma-powered services and DTOs.
3. Build serial ingestion pipeline (parsers per protocol, persistence to Prisma models, metrics).
4. Expand WebSocket eventing to push parsed alerts, command acknowledgements, and node diffs at sub-second cadence.
5. Integrate Leaflet map, inventory tables, and detection wizard UI following the SRS workflows.
6. Add authentication (email/password or OIDC) with RBAC enforcing command restrictions (FOREVER, ERASE_FORCE, multi-site).
7. Cover the system with automated tests (unit + integration) and add CI pipeline hooks.

## Useful Commands

```bash
# Lint and format
pnpm lint
pnpm format

# Backend-specific helpers
cd apps/backend
pnpm prisma:studio        # Inspect database tables
pnpm prisma:seed          # Seed defaults

# Frontend production build preview
cd apps/frontend
pnpm build && pnpm preview

# Standalone Meshtastic sniffer
pnpm tool:sniffer -- --port /dev/ttyUSB0
```

### Meshtastic Sniffer Utility

For quick packet capture without running the full backend, a standalone TypeScript script lives at `tools/meshtastic-sniffer.ts`. It opens a serial port and records every line exactly as it arrives (no parsing), so you can build fixture sets for future parser improvements.

Run it with pnpm (the `--` passes flags to the script). By default the sniffer writes to `logs/meshtastic-raw-<timestamp>.log` and echoes the same content to stdout:

```bash
# Raw text mirrored to logs/meshtastic-raw-*.log
pnpm tool:sniffer -- --port /dev/ttyUSB0

# Custom baud and explicit output path
pnpm tool:sniffer -- --port COM11 --baud 921600 --output captures/site-a.log

# JSONL capture without stdout noise (good for ingestion pipelines)
pnpm tool:sniffer -- --port /dev/ttyACM0 --json --no-stdout --append
```

Useful flags:

- `-p, --port` (required): serial device path (e.g., `/dev/ttyUSB0`, `COM5`)
- `-b, --baud`: baud rate (default `115200`)
- `-o, --output`: file to write (directories created automatically)
- `--json`: emit newline-delimited JSON entries `{ ts, line }`
- `--no-stdout`: disable console mirroring (file-only capture)
- `--delimiter`: override the delimiter (default `\n`; accepts escaped `\r\n`, etc.)
- `--append`: append to the existing file instead of truncating

Use this utility to gather real firmware traffic and feed the captured logs back into parser development or regression tests without touching the NestJS/React applications.

Feel free to iterate on any module (serial ingest, command orchestration, UI flows) and extend the schema, controllers, or React components as the Command Center evolves.

# AntiHunter Command And Control PRO
AntiHunter Perimeter Defense Systems

