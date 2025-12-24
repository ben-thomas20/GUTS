# syntax=docker/dockerfile:1.4

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files (explicitly include public folder for emotes)
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY package.json ./

# Build argument for API URL - Railway automatically passes env vars as build args
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the application (VITE_API_URL must be set at build time, not runtime)
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

