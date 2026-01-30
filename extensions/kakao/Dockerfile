# Moltbot + KakaoTalk Channel - Cloud Deployment
# This Dockerfile creates a production-ready Moltbot instance with KakaoTalk integration

FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY extensions/kakao/package.json extensions/kakao/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY . .

# Build the project
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built artifacts
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/extensions/kakao ./extensions/kakao

# Create data directory for persistent storage
RUN mkdir -p /data/.moltbot

# Set environment variables
ENV NODE_ENV=production
ENV MOLTBOT_DATA_DIR=/data/.moltbot
ENV MOLTBOT_CONFIG_DIR=/data/.moltbot

# Expose webhook port (default for Kakao)
EXPOSE 8788

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8788/health || exit 1

# Run gateway with Kakao channel
CMD ["node", "dist/cli/index.js", "gateway", "run", "--bind", "0.0.0.0", "--port", "8788"]
