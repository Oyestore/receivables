# =====================================================
# Production Dockerfile for Module 05: Milestone Workflows
# =====================================================

# Stage 1: Build
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY src ./src
COPY test ./test

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production

# Install security updates and runtime dependencies
RUN apk upgrade --no-cache && \
    apk add --no-cache \
    dumb-init \
    curl \
    postgresql-client \
    redis \
    tzdata \
    ca-certificates

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R nodejs:nodejs /app/logs /app/uploads /app/temp

# Copy configuration files
COPY --chown=nodejs:nodejs .env.example .env
COPY --chown=nodejs:nodejs docker-compose.yml .

# Set timezone
ENV TZ=Asia/Kolkata

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3005/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
