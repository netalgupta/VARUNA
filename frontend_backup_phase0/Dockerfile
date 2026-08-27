FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for modern package managers (optional, using npm here)
# Copy root workspace items if we were using a monorepo, 
# but for now we copy what we need.

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build the Next.js app 
# Next.js will produce a .next/standalone directory because of next.config.js
RUN npm run build

# ── Runner ──
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

EXPOSE 3000

CMD ["node", "server.js"]
