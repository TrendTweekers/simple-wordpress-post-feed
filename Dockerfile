# ---------- BUILD STAGE ----------
FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 py3-pip make g++

COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 py3-pip make g++

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund

# 🔴 THIS IS THE CRITICAL PART - Copy only what's needed at runtime
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/store ./store
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 8080
CMD ["node", "server/index.js"]
