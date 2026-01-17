# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S payment -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=base --chown=payment:nodejs /app/dist ./dist
COPY --from=base --chown=payment:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=payment:nodejs /app/package*.json ./

# Switch to non-root user
USER payment

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js || exit 1

# Start the application
CMD ["node", "dist/main.js"]
