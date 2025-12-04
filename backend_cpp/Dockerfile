# syntax=docker/dockerfile:1.4

# Build stage
FROM ubuntu:22.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only dependency files first for better caching
COPY CMakeLists.txt ./
COPY include/ ./include/

# Copy source files
COPY src/ ./src/

# Build the application with optimizations
RUN --mount=type=cache,target=/app/build/CMakeFiles \
    mkdir -p build && \
    cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j$(nproc)

# Runtime stage - smaller image
FROM ubuntu:22.04

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only the built executable
COPY --from=builder /app/build/guts_server ./build/guts_server

# Create necessary directories
RUN mkdir -p uploads/tmp

# Expose port (Railway will override with $PORT)
EXPOSE 3001

# Set default environment variables (Railway will override these)
ENV PORT=3001
ENV HOST=0.0.0.0

# Run the server
CMD ["./build/guts_server"]

