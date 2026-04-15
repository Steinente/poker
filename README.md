# Poker

## Modes

This project supports two primary workflows:

1. Local development
2. Docker-based test/prod deployment

## Quick Start

Local development:

```bash
pnpm dev
```

Docker test/prod:

```bash
docker compose up -d --build
```

## Development

Requirements:

- Node.js and pnpm
- A running PostgreSQL database (or Docker Postgres)
- Installed dependencies (`pnpm install`)

### Start everything locally

From repo root:

```bash
pnpm dev
```

This starts:

- Server in watch mode
- Client UI with Angular dev server

Defaults:

- Client UI: `http://localhost:4200`
- Server: `http://localhost:3000`

### Individual commands

Client only:

```bash
pnpm dev:client-ui
```

Server only:

```bash
pnpm dev:server
```

### Local database migrations

Apply migrations in dev mode:

```bash
pnpm --filter @poker/server prisma:migrate
```

Generate Prisma client:

```bash
pnpm --filter @poker/server prisma:generate
```

## Docker Test/Prod

Start from repo root:

```bash
docker compose up -d --build
```

The app is then reachable at `http://localhost:8080`.

Stop and redeploy:

```bash
docker compose down
docker compose up -d --build
```

### Important environment variables

The `docker-compose.yml` provides defaults. You can override via shell env or `.env`:

- `DOCKER_CLIENT_UI_URL` (default: `http://localhost:8080`)
- `DOCKER_SERVER_PORT` (default: `3000`)
- `DOCKER_DATABASE_URL` (default: `postgresql://poker:poker@postgres:5432/poker`)
- `DOCKER_POSTGRES_USER` / `DOCKER_POSTGRES_PASSWORD` / `DOCKER_POSTGRES_DB`
- `DOCKER_HOST_DISCONNECT_TIMEOUT_MS` (default: `180000`)

Example (LAN):

```bash
DOCKER_CLIENT_UI_URL=http://192.168.178.50:8080 docker compose up -d --build
```

### Docker notes

- In local dev, the client connects to `http://localhost:3000`.
- In Docker mode, the client uses Angular SSR behind Nginx.
- Nginx proxies page traffic to SSR and `/socket.io` internally to the server.
- Database data is persisted in volume `postgres_data`.

### Database migration in deploy context

For applying existing migrations in test/prod:

```bash
pnpm --filter @poker/server prisma:deploy
```

## Build

Build all:

```bash
pnpm build
```

Build client only:

```bash
pnpm build:client-ui
```

Build server only:

```bash
pnpm build:server
```
