#!/bin/bash

# Quick start script for GUTS Card Game with C++ backend
# Usage: ./start.sh [build|run|dev|clean]

set -e  # Exit on error

BACKEND_DIR="backend_cpp"
FRONTEND_DIR="frontend"
BUILD_DIR="$BACKEND_DIR/build"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  GUTS Card Game - C++ Backend${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

function check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    # Check for cmake
    if ! command -v cmake &> /dev/null; then
        echo -e "${RED}Error: cmake is not installed${NC}"
        echo "Please install cmake:"
        echo "  macOS: brew install cmake"
        echo "  Ubuntu: sudo apt-get install cmake"
        exit 1
    fi
    
    # Check for C++ compiler
    if ! command -v g++ &> /dev/null && ! command -v clang++ &> /dev/null; then
        echo -e "${RED}Error: No C++ compiler found${NC}"
        echo "Please install a C++ compiler:"
        echo "  macOS: xcode-select --install"
        echo "  Ubuntu: sudo apt-get install build-essential"
        exit 1
    fi
    
    # Check for OpenSSL
    if [ -f /usr/local/opt/openssl/lib/libssl.dylib ] || \
       [ -f /usr/lib/x86_64-linux-gnu/libssl.so ] || \
       [ -f /usr/lib64/libssl.so ]; then
        echo -e "${GREEN}✓ OpenSSL found${NC}"
    else
        echo -e "${YELLOW}Warning: OpenSSL may not be installed${NC}"
        echo "If build fails, install OpenSSL:"
        echo "  macOS: brew install openssl"
        echo "  Ubuntu: sudo apt-get install libssl-dev"
    fi
    
    echo -e "${GREEN}✓ All required dependencies found${NC}"
}

function build_backend() {
    echo -e "${YELLOW}Building C++ backend...${NC}"
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"
    
    # Configure with CMake
    echo -e "${YELLOW}Configuring with CMake...${NC}"
    if [ "$(uname)" == "Darwin" ]; then
        # macOS - specify OpenSSL location if needed
        cmake -DCMAKE_BUILD_TYPE=Release \
              -DOPENSSL_ROOT_DIR=/usr/local/opt/openssl \
              .. 2>/dev/null || cmake -DCMAKE_BUILD_TYPE=Release ..
    else
        cmake -DCMAKE_BUILD_TYPE=Release ..
    fi
    
    # Build
    echo -e "${YELLOW}Compiling (this may take 30-60 seconds)...${NC}"
    make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
    
    cd - > /dev/null
    echo -e "${GREEN}✓ Backend built successfully!${NC}"
    echo -e "${GREEN}  Executable: $BUILD_DIR/guts_server${NC}"
}

function run_backend() {
    if [ ! -f "$BUILD_DIR/guts_server" ]; then
        echo -e "${YELLOW}Backend not built yet. Building now...${NC}"
        build_backend
    fi
    
    echo -e "${GREEN}Starting C++ backend on port 3001...${NC}"
    cd "$BUILD_DIR"
    PORT=3001 FRONTEND_URL=http://localhost:5173 ./guts_server
}

function setup_frontend() {
    echo -e "${YELLOW}Setting up frontend...${NC}"
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    
    cd - > /dev/null
    echo -e "${GREEN}✓ Frontend ready${NC}"
}

function run_frontend() {
    setup_frontend
    
    echo -e "${GREEN}Starting frontend on port 5173...${NC}"
    cd "$FRONTEND_DIR"
    npm run dev
}

function dev_mode() {
    print_header
    check_dependencies
    
    # Build backend if needed
    if [ ! -f "$BUILD_DIR/guts_server" ]; then
        build_backend
    fi
    
    # Setup frontend
    setup_frontend
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Starting development servers...${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Backend:${NC}  http://localhost:3001"
    echo -e "${YELLOW}Frontend:${NC} http://localhost:5173"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
    echo ""
    
    # Run both in background
    (cd "$BUILD_DIR" && PORT=3001 FRONTEND_URL=http://localhost:5173 ./guts_server) &
    BACKEND_PID=$!
    
    sleep 2
    
    (cd "$FRONTEND_DIR" && npm run dev) &
    FRONTEND_PID=$!
    
    # Trap Ctrl+C to kill both processes
    trap "echo '';echo -e '${YELLOW}Stopping servers...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
    
    # Wait for both processes
    wait
}

function clean_build() {
    echo -e "${YELLOW}Cleaning build artifacts...${NC}"
    rm -rf "$BUILD_DIR"
    echo -e "${GREEN}✓ Build directory cleaned${NC}"
}

function show_help() {
    print_header
    echo ""
    echo "Usage: ./start.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build    - Build C++ backend only"
    echo "  run      - Run backend only (builds if needed)"
    echo "  frontend - Run frontend only"
    echo "  dev      - Run both backend and frontend (default)"
    echo "  clean    - Clean build artifacts"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start.sh           # Start both servers"
    echo "  ./start.sh build     # Just build backend"
    echo "  ./start.sh clean     # Clean and rebuild"
    echo ""
}

# Main script
case "${1:-dev}" in
    build)
        print_header
        check_dependencies
        build_backend
        ;;
    run)
        print_header
        run_backend
        ;;
    frontend)
        print_header
        run_frontend
        ;;
    dev)
        dev_mode
        ;;
    clean)
        print_header
        clean_build
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac

