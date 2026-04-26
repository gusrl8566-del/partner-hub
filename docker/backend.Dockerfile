FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter backend... --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm --filter backend prisma:generate
RUN pnpm --filter @partner-hub/shared build
RUN pnpm --filter backend build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 4100
CMD ["sh", "-c", "pnpm --filter backend exec prisma db push && pnpm --filter backend start:prod"]
