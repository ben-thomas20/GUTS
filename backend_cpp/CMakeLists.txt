cmake_minimum_required(VERSION 3.15)
project(guts_server VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Find required packages
find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

# Add Drogon framework
include(FetchContent)

FetchContent_Declare(
    drogon
    GIT_REPOSITORY https://github.com/drogonframework/drogon.git
    GIT_TAG v1.9.8
)

# Configure Drogon
set(BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(BUILD_CTL OFF CACHE BOOL "" FORCE)
set(BUILD_ORM OFF CACHE BOOL "" FORCE)
set(BUILD_REDIS OFF CACHE BOOL "" FORCE)
set(BUILD_TESTING OFF CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(drogon)

# nlohmann_json - JSON library
FetchContent_Declare(
    json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
)
FetchContent_MakeAvailable(json)

# Define source files
set(SOURCES
    src/server.cpp
    src/GameLogic.cpp
    src/GameManager.cpp
)

set(HEADERS
    include/Card.hpp
    include/Player.hpp
    include/Game.hpp
    include/GameLogic.hpp
    include/GameManager.hpp
)

# Create executable
add_executable(guts_server ${SOURCES} ${HEADERS})

# Include directories
target_include_directories(guts_server PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${OPENSSL_INCLUDE_DIR}
)

# Link libraries
target_link_libraries(guts_server PRIVATE
    drogon
    nlohmann_json::nlohmann_json
    OpenSSL::SSL
    OpenSSL::Crypto
    Threads::Threads
)

# Compiler options
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(guts_server PRIVATE
        -Wall
        -Wextra
        -O3
        -march=native
    )
elseif(MSVC)
    target_compile_options(guts_server PRIVATE
        /W4
        /O2
    )
endif()

# Installation
install(TARGETS guts_server
    RUNTIME DESTINATION bin
)
