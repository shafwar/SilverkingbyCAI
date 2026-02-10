# Railway deployment: use Docker builder to avoid Railpack/ghcr.io connection issues
# Node 20 + system deps for canvas (cairo, pango, etc.)

FROM node:20-bookworm-slim AS base

# System deps for canvas (same as nixpacks.toml)
RUN apt-get update && apt-get install -y --no-install-recommends \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies
COPY package.json package-lock.json .npmrc* ./
RUN npm ci --legacy-peer-deps

# Prisma
COPY prisma ./prisma
RUN npx prisma generate

# App
COPY . .

# Build (Prisma already generated)
ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000

# Same as package.json "start": migrate then next start
CMD ["node", "-r", "dotenv/config", "scripts/migrate-and-start.js"]
