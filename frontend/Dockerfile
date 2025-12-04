# syntax=docker/dockerfile:1.4

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for better caching
COPY package*.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,id=npm_cache,target=/root/.npm \
    npm ci

# Copy source files
COPY . .

# Build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the application
RUN npm run build

# Runtime stage - serve static files
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port (Railway will override with $PORT)
EXPOSE 3000

# Use PORT environment variable if provided by Railway
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]

