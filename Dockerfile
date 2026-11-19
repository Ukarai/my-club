# syntax=docker/dockerfile:1
# Build:  docker build -t my-club .
# Run:    docker run -d -p 3000:3000 -v club-data:/app/data my-club
# (or use compose.yaml). The database lives on the /app/data volume.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base
ARG PNPM_VERSION=12.16.1
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS prod-deps
RUN pnpm install --prod --frozen-lockfile

FROM node:${NODE_VERSION}-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    CLUB_DB_PATH=/app/data/club.db
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json server.mjs ./
COPY scripts ./scripts
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.mjs"]
