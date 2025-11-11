# Use a modern Node with Alpine; add toolchain so next/webpack and any native deps build cleanly
FROM node:18-alpine

# Native build tools & glibc compat for some node modules
RUN apk add --no-cache python3 make g++ libc6-compat bash

WORKDIR /app

# Install deps with a clean, reproducible lockfile install
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

# Copy the rest of the app
COPY . .

# Build Next.js for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# Cloud Run listens on $PORT (we'll default to 8080)
ENV PORT=8080
EXPOSE 8080

# Start your custom Koa server (as defined in package.json "start")
CMD ["node", "server/index.js"]
