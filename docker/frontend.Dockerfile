FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter frontend... --frozen-lockfile=false

FROM deps AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:4100/api
ARG NEXT_PUBLIC_USE_MOCK=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_USE_MOCK=$NEXT_PUBLIC_USE_MOCK
COPY . .
RUN pnpm --filter @partner-hub/shared build
RUN pnpm --filter frontend build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_PUBLIC_USE_MOCK=false
COPY --from=build /app ./
EXPOSE 3100
CMD ["pnpm", "--filter", "frontend", "start"]
