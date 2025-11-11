# ---- deps: install node_modules with the right toolchain ----
FROM node:18-alpine AS deps
WORKDIR /app
# Needed by some native deps and next-swc
RUN apk add --no-cache libc6-compat python3 make g++ bash
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

# ---- builder: build the Next.js app ----
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# ---- runner: lightweight image to run the app ----
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only what we need to run
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 8080
# Start Next in production on Cloud Run's port
CMD ["node_modules/.bin/next", "start", "-p", "8080"]
