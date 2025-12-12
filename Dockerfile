FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN mkdir -p public
RUN npm run build
# If using standalone output, copy static files into standalone directory
RUN if [ -d ".next/standalone" ]; then mkdir -p .next/standalone/.next && cp -R .next/static .next/standalone/.next/static || true; fi

FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/store ./store
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080
CMD ["node", "server/index.js"]
