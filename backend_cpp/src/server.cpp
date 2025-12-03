#include "GameManager.hpp"
#include <crow.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <map>
#include <mutex>
#include <thread>
#include <chrono>

using json = nlohmann::json;

// WebSocket connection manager
class WSConnectionManager {
public:
    void addConnection(const std::string& socketId, crow::websocket::connection& conn) {
        std::lock_guard<std::mutex> lock(mutex_);
        connections_[socketId] = &conn;
    }
    
    void removeConnection(const std::string& socketId) {
        std::lock_guard<std::mutex> lock(mutex_);
        connections_.erase(socketId);
    }
    
    void sendMessage(const std::string& socketId, const std::string& event, const json& data) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = connections_.find(socketId);
        if (it != connections_.end() && it->second) {
            json message = {
                {"event", event},
                {"data", data}
            };
            try {
                it->second->send_text(message.dump());
            } catch (const std::exception& e) {
                std::cerr << "Error sending message to " << socketId << ": " << e.what() << std::endl;
            }
        }
    }
    
    void broadcastToRoom(const std::string& roomCode, const std::string& event, const json& data) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto roomIt = roomConnections_.find(roomCode);
        if (roomIt == roomConnections_.end()) return;
        
        json message = {
            {"event", event},
            {"data", data}
        };
        std::string messageStr = message.dump();
        
        for (const auto& socketId : roomIt->second) {
            auto connIt = connections_.find(socketId);
            if (connIt != connections_.end() && connIt->second) {
                try {
                    connIt->second->send_text(messageStr);
                } catch (const std::exception& e) {
                    std::cerr << "Error broadcasting to " << socketId << ": " << e.what() << std::endl;
                }
            }
        }
    }
    
    void joinRoom(const std::string& socketId, const std::string& roomCode) {
        std::lock_guard<std::mutex> lock(mutex_);
        roomConnections_[roomCode].insert(socketId);
        socketRooms_[socketId] = roomCode;
    }
    
    void leaveRoom(const std::string& socketId) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = socketRooms_.find(socketId);
        if (it != socketRooms_.end()) {
            roomConnections_[it->second].erase(socketId);
            socketRooms_.erase(it);
        }
    }

private:
    std::mutex mutex_;
    std::map<std::string, crow::websocket::connection*> connections_;
    std::map<std::string, std::set<std::string>> roomConnections_; // roomCode -> socketIds
    std::map<std::string, std::string> socketRooms_; // socketId -> roomCode
};

std::string generateSocketId() {
    static std::random_device rd;
    static std::mt19937_64 gen(rd());
    static std::uniform_int_distribution<uint64_t> dis;
    
    uint64_t id = dis(gen);
    char buffer[17];
    snprintf(buffer, sizeof(buffer), "%016lx", id);
    return std::string(buffer);
}

int main() {
    crow::SimpleApp app;
    
    // Get frontend URL for CORS (manual CORS headers are set on each route)
    std::string frontendUrl = std::getenv("FRONTEND_URL") ? 
        std::getenv("FRONTEND_URL") : "http://localhost:5173";
    
    WSConnectionManager wsManager;
    
    // Callbacks for game manager
    auto sendMessageCallback = [&wsManager](const std::string& socketId, 
                                           const std::string& event, 
                                           const json& data) {
        wsManager.sendMessage(socketId, event, data);
    };
    
    auto broadcastCallback = [&wsManager](const std::string& roomCode,
                                         const std::string& event,
                                         const json& data) {
        wsManager.broadcastToRoom(roomCode, event, data);
    };
    
    guts::GameManager gameManager(sendMessageCallback, broadcastCallback);
    
    // Health check endpoint
    CROW_ROUTE(app, "/api/health")
    ([](const crow::request& req) {
        json response = {
            {"status", "ok"},
            {"timestamp", std::chrono::system_clock::now().time_since_epoch().count()}
        };
        
        crow::response res;
        res.code = 200;
        res.set_header("Content-Type", "application/json");
        res.set_header("Access-Control-Allow-Origin", "*");
        res.write(response.dump());
        return res;
    });
    
    // Create game endpoint
    CROW_ROUTE(app, "/api/game/create")
    .methods(crow::HTTPMethod::POST)
    ([&gameManager](const crow::request& req) {
        try {
            std::string roomCode = gameManager.generateRoomCode();
            std::string hostToken = generateSocketId(); // Reuse this function for UUID generation
            
            gameManager.createGame(roomCode, hostToken);
            
            json response = {
                {"roomCode", roomCode},
                {"hostToken", hostToken}
            };
            
            crow::response res;
            res.code = 200;
            res.set_header("Content-Type", "application/json");
            res.set_header("Access-Control-Allow-Origin", "*");
            res.write(response.dump());
            return res;
        } catch (const std::exception& e) {
            crow::response res;
            res.code = 500;
            res.set_header("Content-Type", "application/json");
            res.set_header("Access-Control-Allow-Origin", "*");
            json error = {{"error", e.what()}};
            res.write(error.dump());
            return res;
        }
    });
    
    // Join game endpoint
    CROW_ROUTE(app, "/api/game/join")
    .methods(crow::HTTPMethod::POST)
    ([&gameManager](const crow::request& req) {
        try {
            auto body = json::parse(req.body);
            
            if (!body.contains("roomCode") || !body.contains("playerName")) {
                crow::response res;
                res.code = 400;
                res.set_header("Content-Type", "application/json");
                res.set_header("Access-Control-Allow-Origin", "*");
                json error = {{"error", "Room code and player name required"}};
                res.write(error.dump());
                return res;
            }
            
            std::string roomCode = body["roomCode"];
            std::string playerName = body["playerName"];
            
            auto* game = gameManager.getGame(roomCode);
            if (!game) {
                crow::response res;
                res.code = 404;
                res.set_header("Content-Type", "application/json");
                res.set_header("Access-Control-Allow-Origin", "*");
                json error = {{"error", "Game not found"}};
                res.write(error.dump());
                return res;
            }
            
            if (game->state != guts::GameState::LOBBY) {
                crow::response res;
                res.code = 400;
                res.set_header("Content-Type", "application/json");
                res.set_header("Access-Control-Allow-Origin", "*");
                json error = {{"error", "Game already started"}};
                res.write(error.dump());
                return res;
            }
            
            if (game->players.size() >= 8) {
                crow::response res;
                res.code = 400;
                res.set_header("Content-Type", "application/json");
                res.set_header("Access-Control-Allow-Origin", "*");
                json error = {{"error", "Game is full"}};
                res.write(error.dump());
                return res;
            }
            
            std::string playerToken = generateSocketId();
            json response = {
                {"playerToken", playerToken},
                {"roomCode", roomCode}
            };
            
            crow::response res;
            res.code = 200;
            res.set_header("Content-Type", "application/json");
            res.set_header("Access-Control-Allow-Origin", "*");
            res.write(response.dump());
            return res;
        } catch (const std::exception& e) {
            crow::response res;
            res.code = 500;
            res.set_header("Content-Type", "application/json");
            res.set_header("Access-Control-Allow-Origin", "*");
            json error = {{"error", e.what()}};
            res.write(error.dump());
            return res;
        }
    });
    
    // Get game status endpoint
    CROW_ROUTE(app, "/api/game/<string>/status")
    ([&gameManager](const std::string& roomCode) {
        auto* game = gameManager.getGame(roomCode);
        
        if (!game) {
            crow::response res;
            res.code = 404;
            res.set_header("Content-Type", "application/json");
            res.set_header("Access-Control-Allow-Origin", "*");
            json error = {{"error", "Game not found"}};
            res.write(error.dump());
            return res;
        }
        
        std::string stateStr = game->state == guts::GameState::LOBBY ? "lobby" :
                              (game->state == guts::GameState::PLAYING ? "playing" : "ended");
        
        json response = {
            {"state", stateStr},
            {"playerCount", game->players.size()},
            {"round", game->round}
        };
        
        crow::response res;
        res.code = 200;
        res.set_header("Content-Type", "application/json");
        res.set_header("Access-Control-Allow-Origin", "*");
        res.write(response.dump());
        return res;
    });
    
    // WebSocket endpoint
    CROW_ROUTE(app, "/ws")
    .websocket()
    .onopen([&wsManager](crow::websocket::connection& conn) {
        std::string socketId = generateSocketId();
        wsManager.addConnection(socketId, conn);
        
        // Store socketId in connection context
        conn.userdata(new std::string(socketId));
        
        std::cout << "WebSocket connected: " << socketId << std::endl;
    })
    .onclose([&wsManager, &gameManager](crow::websocket::connection& conn, const std::string& reason) {
        if (conn.userdata()) {
            std::string* socketIdPtr = static_cast<std::string*>(conn.userdata());
            std::string socketId = *socketIdPtr;
            
            std::cout << "WebSocket disconnected: " << socketId << std::endl;
            
            gameManager.handleDisconnect(socketId);
            wsManager.leaveRoom(socketId);
            wsManager.removeConnection(socketId);
            
            delete socketIdPtr;
        }
    })
    .onmessage([&wsManager, &gameManager](crow::websocket::connection& conn,
                                         const std::string& data,
                                         bool is_binary) {
        if (!conn.userdata()) return;
        
        std::string* socketIdPtr = static_cast<std::string*>(conn.userdata());
        std::string socketId = *socketIdPtr;
        
        try {
            auto message = json::parse(data);
            
            if (!message.contains("event")) return;
            
            std::string event = message["event"];
            json eventData = message.contains("data") ? message["data"] : json::object();
            
            // Handle different events
            if (event == "join_room") {
                if (eventData.contains("roomCode")) {
                    wsManager.joinRoom(socketId, eventData["roomCode"]);
                }
                gameManager.handleJoinRoom(socketId, eventData);
            } else if (event == "start_game") {
                gameManager.handleStartGame(socketId, eventData);
            } else if (event == "set_buy_in") {
                gameManager.handleSetBuyIn(socketId, eventData);
            } else if (event == "player_decision") {
                gameManager.handlePlayerDecision(socketId, eventData);
            } else if (event == "next_round") {
                gameManager.handleNextRound(socketId, eventData);
            } else if (event == "leave_game") {
                gameManager.handleLeaveGame(socketId);
            } else if (event == "buy_back_in") {
                gameManager.handleBuyBackIn(socketId, eventData);
            } else if (event == "end_game") {
                gameManager.handleEndGame(socketId);
            }
        } catch (const std::exception& e) {
            std::cerr << "Error handling message from " << socketId << ": " << e.what() << std::endl;
            wsManager.sendMessage(socketId, "error", {{"message", "Internal server error"}});
        }
    });
    
    // Start cleanup thread
    std::thread cleanupThread([&gameManager]() {
        while (true) {
            std::this_thread::sleep_for(std::chrono::minutes(5));
            gameManager.cleanupAbandonedGames();
        }
    });
    cleanupThread.detach();
    
    // Get port from environment or use default
    int port = std::getenv("PORT") ? std::atoi(std::getenv("PORT")) : 3001;
    
    std::cout << "Starting C++ GUTS server on 0.0.0.0:" << port << std::endl;
    std::cout << "Frontend URL: " << frontendUrl << std::endl;
    
    // Bind to 0.0.0.0 for Railway (not localhost)
    app.bindaddr("0.0.0.0")
       .port(port)
       .multithreaded()
       .run();
    
    return 0;
}

