# Simple, reliable Docker build for your Next/Node app
FROM node:18-alpine

# Create app dir
WORKDIR /usr/src/app

# Install only prod deps first (use npm, we don't require a lockfile)
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# Runtime
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm","start"]
