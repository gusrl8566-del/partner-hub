# Setup

## Prerequisites

- Node.js 18+
- `pnpm` 9+ preferred
- Docker and Docker Compose
- PostgreSQL 16 if running without Docker

## Local Environment

1. Copy `.env.example` to `.env`.
2. Install dependencies with `pnpm install`.
3. Generate Prisma client with `pnpm db:generate`.
4. Run database migrations with `pnpm db:migrate`.
5. Seed an initial admin with `pnpm db:seed`.
6. Start the apps with `pnpm dev`.

## Docker

Use `docker compose up --build` to boot PostgreSQL, NestJS, and Next.js on isolated ports.

## NAS Deployment Notes

- Container names and ports are isolated under the `partnerhub-*` namespace.
- The stack is stateless except for the PostgreSQL volume and environment variables.
- Reverse proxying can target `partnerhub-frontend:3100` and `partnerhub-backend:4100`.
- Replace the development JWT secret and database credentials before deployment.
