# ---------- BUILD STAGE ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Install Python and build dependencies for native modules (sqlite3)
RUN apk add --no-cache python3 py3-pip make g++

COPY package*.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install Python and build dependencies for native modules (sqlite3) - needed for runtime sqlite3
RUN apk add --no-cache python3 py3-pip make g++

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps --no-audit --no-fund

# 🔴 THIS IS THE CRITICAL PART - Copy .next from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server ./server
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/pages ./pages
COPY --from=builder /app/components ./components
COPY --from=builder /app/styles.scss ./styles.scss

EXPOSE 8080
CMD ["node", "server/index.js"]
