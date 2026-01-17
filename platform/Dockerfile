# Root Monolith Dockerfile
# Builds the entire Platform API (Modules 1-17)

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy Root Configs
COPY package*.json tsconfig*.json ./

# Install Dependencies
RUN npm ci

# Copy Source Code (Everything)
COPY . .

# Build API
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl

# Copy Build Artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Environment Defaults
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start Monolith
CMD ["node", "dist/main"]
