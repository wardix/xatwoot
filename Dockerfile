# Use official Bun image
FROM oven/bun:1.2-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy application source
COPY . .

# Build frontend & widget assets
RUN bun run build:widget || true

# Expose server port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["bun", "run", "src/index.ts"]
