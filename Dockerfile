# Next.js App Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable pnpm

# Copy package files for dependency fetching
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Fetch dependencies to pnpm store (no symlinking yet)
RUN pnpm fetch --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable pnpm

# Copy package files and pnpm config
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Copy pnpm store from deps stage
COPY --from=deps /root/.local/share/pnpm/store /root/.local/share/pnpm/store

# Install dependencies from cached store using hoisted linking
RUN pnpm install --frozen-lockfile --offline

# Copy application code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
