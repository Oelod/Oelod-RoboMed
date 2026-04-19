# Institutional Node Dockerfile
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies (for optional packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose institutional port
EXPOSE 5000

# Registry Handshake: Ensure environment is production
ENV NODE_ENV=production

# Industrial Boot
CMD ["node", "server.js"]
