# ─── Stage 1: Build ──────────────────────────────────────────────────────────
# Full deps needed: TypeScript compiler, NestJS CLI, Prisma CLI
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Generate Prisma client before compiling TypeScript
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Compile TypeScript (outputs to dist/)
COPY . .
RUN npm run build

# ─── Stage 2: Production dependencies ────────────────────────────────────────
FROM node:20-alpine AS prod-deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Production node_modules (no devDeps)
COPY --from=prod-deps --chown=appuser:nodejs /app/node_modules ./node_modules

# Prisma generated client (built against full schema — overrides prod-deps version)
COPY --from=builder --chown=appuser:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=appuser:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI — needed for `migrate deploy` at container startup (devDep, not in prod-deps)
COPY --from=builder --chown=appuser:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder --chown=appuser:nodejs /app/node_modules/prisma ./node_modules/prisma

# Compiled application
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist

# Prisma schema + migrations + config (required by migrate deploy)
COPY --from=builder --chown=appuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=appuser:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./

# Persistent upload directories
RUN mkdir -p uploads/profiles uploads/food uploads/exercises && \
    chown -R appuser:nodejs uploads

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/auth/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main"]
