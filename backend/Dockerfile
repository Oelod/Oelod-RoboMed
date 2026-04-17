# Production Dockerfile for RoboMed Backend — Institutional Resilience Edition
FROM node:20-slim AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Stage 2: Production Execution Layer
FROM node:20-slim

WORKDIR /usr/src/app

# Only copy production-ready modules and source
COPY --from=builder /usr/src/app /usr/src/app

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Directly invoke entrypoint for cleaner process management
CMD ["node", "src/server.js"]
