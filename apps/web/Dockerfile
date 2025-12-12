# Next.js App Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable pnpm

# Copy workspace config and package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY apps/web/package.json ./apps/web/

# Fetch dependencies to pnpm store (no symlinking yet)
RUN pnpm fetch --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable pnpm

# Copy workspace config and package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY apps/web/package.json ./apps/web/

# Copy pnpm store from deps stage
COPY --from=deps /root/.local/share/pnpm/store /root/.local/share/pnpm/store

# Install dependencies from cached store using hoisted linking
RUN pnpm install --frozen-lockfile --offline

# Copy application code
COPY apps/web ./apps/web
COPY turbo.json ./

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Accepts build args for Supabase (required for static generation)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY

# Build from web app directory
WORKDIR /app/apps/web
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The standalone output for monorepo puts server.js in apps/web/
CMD ["node", "apps/web/server.js"]
