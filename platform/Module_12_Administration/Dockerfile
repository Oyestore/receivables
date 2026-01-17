# Multi-stage Dockerfile for Module 12 Administration
# Optimized for production deployment with security best practices

# =================================================================
# Build Stage
# =================================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# =================================================================
# Production Stage
# =================================================================
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force && \
    npm uninstall -g npm

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create necessary directories
RUN mkdir -p \
    /var/log/sme-platform \
    /app/uploads \
    /app/backups \
    /app/ssl \
    && chown -R nodejs:nodejs /app \
    && chown -R nodejs:nodejs /var/log/sme-platform

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3012
ENV API_PREFIX=api/v1

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3012

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3012/health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
