# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dispute -u 1001

# Build stage
FROM base AS builder

# Install all dependencies including dev dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM base AS production

# Copy built application from builder stage
COPY --from=builder --chown=dispute:nodejs /app/dist ./dist
COPY --from=builder --chown=dispute:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=dispute:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs && \
    chown -R dispute:nodejs /app

# Switch to non-root user
USER dispute

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3008/health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
