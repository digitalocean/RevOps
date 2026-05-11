# Single-container Meridian: Vite build → backend/public, Express serves API + SPA.
# Build from repo root:  docker build -t meridian:latest .

# ── Stage 1: build Helm (Vite) ─────────────────────────────
FROM node:20-bookworm AS helm-build
WORKDIR /helm
COPY Helm/package.json Helm/package-lock.json ./
RUN npm ci
COPY Helm/ ./
# Same-origin API calls in production (see Helm/src/app/api/meridian.ts)
ENV NODE_ENV=production
RUN npm run build

# ── Stage 2: Node API + static files ─────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=helm-build /helm/dist ./public
ENV NODE_ENV=production
ENV PORT=8080
ENV SERVE_STATIC=true
EXPOSE 8080
CMD ["node", "server.js"]
