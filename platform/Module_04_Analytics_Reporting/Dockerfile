FROM node:18-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN npm run build

FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S analytics -u 1001

WORKDIR /app

COPY --from=base --chown=analytics:nodejs /app/dist ./dist
COPY --from=base --chown=analytics:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=analytics:nodejs /app/package*.json ./

USER analytics

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js || exit 1

CMD ["node", "dist/main.js"]
