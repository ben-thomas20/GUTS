#include "GameManager.hpp"
#include <drogon/drogon.h>
#include <drogon/WebSocketController.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <map>
#include <mutex>
#include <memory>

using namespace drogon;
using json = nlohmann::json;

// Global managers (initialized in main)
static std::shared_ptr<guts::GameManager> gameManager;

// WebSocket connection manager
class WSConnectionManager {
public:
    void addConnection(const std::string& socketId, const WebSocketConnectionPtr& conn) {
        std::lock_guard<std::mutex> lock(mutex_);
        connections_[socketId] = conn;
    }
    
    void removeConnection(const std::string& socketId) {
        std::lock_guard<std::mutex> lock(mutex_);
        connections_.erase(socketId);
    }
    
    void sendMessage(const std::string& socketId, const std::string& event, const json& data) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = connections_.find(socketId);
        if (it != connections_.end() && it->second) {
            json message = {{"event", event}, {"data", data}};
            try {
                it->second->send(message.dump());
            } catch (const std::exception& e) {
                std::cerr << "Error sending to " << socketId << ": " << e.what() << std::endl;
            }
        }
    }
    
    void broadcastToRoom(const std::string& roomCode, const std::string& event, const json& data) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto roomIt = roomConnections_.find(roomCode);
        if (roomIt == roomConnections_.end()) return;
        
        json message = {{"event", event}, {"data", data}};
        std::string messageStr = message.dump();
        
        for (const auto& socketId : roomIt->second) {
            auto connIt = connections_.find(socketId);
            if (connIt != connections_.end() && connIt->second) {
                try {
                    connIt->second->send(messageStr);
                } catch (const std::exception& e) {
                    std::cerr << "Error broadcasting: " << e.what() << std::endl;
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
    std::map<std::string, WebSocketConnectionPtr> connections_;
    std::map<std::string, std::set<std::string>> roomConnections_;
    std::map<std::string, std::string> socketRooms_;
};

static std::shared_ptr<WSConnectionManager> wsManager;

// Generate UUID
std::string generateUUID() {
    static std::random_device rd;
    static std::mt19937_64 gen(rd());
    static std::uniform_int_distribution<uint64_t> dis;
    
    uint64_t part1 = dis(gen);
    uint64_t part2 = dis(gen);
    
    char buffer[37];
    snprintf(buffer, sizeof(buffer), "%08llx-%04llx-%04llx-%04llx-%012llx",
        (unsigned long long)((part1 >> 32) & 0xFFFFFFFF),
        (unsigned long long)((part1 >> 16) & 0xFFFF),
        (unsigned long long)(part1 & 0xFFFF),
        (unsigned long long)((part2 >> 48) & 0xFFFF),
        (unsigned long long)(part2 & 0xFFFFFFFFFFFF));
    
    return std::string(buffer);
}

// WebSocket Controller
class WSController : public drogon::WebSocketController<WSController> {
public:
    void handleNewMessage(const WebSocketConnectionPtr& wsConnPtr,
                         std::string&& message,
                         const WebSocketMessageType& type) override {
        if (type != WebSocketMessageType::Text) return;
        
        try {
            auto jsonMsg = json::parse(message);
            if (!jsonMsg.contains("event")) return;
            
            std::string event = jsonMsg["event"];
            json eventData = jsonMsg.contains("data") ? jsonMsg["data"] : json::object();
            
            auto socketIdPtr = wsConnPtr->getContext<std::string>();
            if (!socketIdPtr) return;
            std::string socketId = *socketIdPtr;
            
            if (event == "join_room") {
                if (eventData.contains("roomCode")) {
                    wsManager->joinRoom(socketId, eventData["roomCode"]);
                }
                gameManager->handleJoinRoom(socketId, eventData);
            } else if (event == "start_game") {
                gameManager->handleStartGame(socketId, eventData);
            } else if (event == "set_buy_in") {
                gameManager->handleSetBuyIn(socketId, eventData);
            } else if (event == "player_decision") {
                gameManager->handlePlayerDecision(socketId, eventData);
            } else if (event == "next_round") {
                gameManager->handleNextRound(socketId, eventData);
            } else if (event == "leave_game") {
                gameManager->handleLeaveGame(socketId);
            } else if (event == "buy_back_in") {
                gameManager->handleBuyBackIn(socketId, eventData);
            } else if (event == "end_game") {
                gameManager->handleEndGame(socketId);
            }
        } catch (const std::exception& e) {
            std::cerr << "Error handling message: " << e.what() << std::endl;
        }
    }
    
    void handleNewConnection(const HttpRequestPtr&,
                           const WebSocketConnectionPtr& wsConnPtr) override {
        std::string socketId = generateUUID();
        wsConnPtr->setContext(std::make_shared<std::string>(socketId));
        wsManager->addConnection(socketId, wsConnPtr);
        std::cout << "WebSocket connected: " << socketId << std::endl;
    }
    
    void handleConnectionClosed(const WebSocketConnectionPtr& wsConnPtr) override {
        auto socketIdPtr = wsConnPtr->getContext<std::string>();
        if (socketIdPtr) {
            std::string socketId = *socketIdPtr;
            std::cout << "WebSocket disconnected: " << socketId << std::endl;
            
            gameManager->handleDisconnect(socketId);
            wsManager->leaveRoom(socketId);
            wsManager->removeConnection(socketId);
        }
    }
    
    WS_PATH_LIST_BEGIN
    WS_PATH_ADD("/ws");
    WS_PATH_LIST_END
};

int main() {
    // Initialize managers
    wsManager = std::make_shared<WSConnectionManager>();
    
    auto sendMessageCallback = [](const std::string& socketId, 
                                  const std::string& event, 
                                  const json& data) {
        wsManager->sendMessage(socketId, event, data);
    };
    
    auto broadcastCallback = [](const std::string& roomCode,
                                const std::string& event,
                                const json& data) {
        wsManager->broadcastToRoom(roomCode, event, data);
    };
    
    gameManager = std::make_shared<guts::GameManager>(sendMessageCallback, broadcastCallback);
    
    int port = std::getenv("PORT") ? std::atoi(std::getenv("PORT")) : 3001;
    std::string frontendUrl = std::getenv("FRONTEND_URL") ? 
        std::getenv("FRONTEND_URL") : "http://localhost:5173";
    
    std::cout << "Starting C++ GUTS server on 0.0.0.0:" << port << std::endl;
    std::cout << "Frontend URL: " << frontendUrl << std::endl;
    
    // Configure and start Drogon
    app()
        .setLogPath("./")
        .setLogLevel(trantor::Logger::kWarn)
        .addListener("0.0.0.0", port)
        .setThreadNum(8)
        .registerPostHandlingAdvice([](const HttpRequestPtr&, const HttpResponsePtr& resp) {
            resp->addHeader("Access-Control-Allow-Origin", "*");
            resp->addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            resp->addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        });
    
    // Register simple handlers inline
    app().registerHandler("/api/health",
        [](const HttpRequestPtr&, std::function<void(const HttpResponsePtr&)>&& callback) {
            Json::Value response;
            response["status"] = "ok";
            response["timestamp"] = (Json::Int64)std::chrono::system_clock::now().time_since_epoch().count();
            callback(HttpResponse::newHttpJsonResponse(response));
        }, {Get, Options});
    
    app().registerHandler("/api/game/create",
        [](const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
            // Handle OPTIONS preflight
            if (req->method() == Options) {
                auto resp = HttpResponse::newHttpResponse();
                resp->setStatusCode(k200OK);
                callback(resp);
                return;
            }
            
            std::string roomCode = gameManager->generateRoomCode();
            std::string hostToken = generateUUID();
            gameManager->createGame(roomCode, hostToken);
            
            Json::Value response;
            response["roomCode"] = roomCode;
            response["hostToken"] = hostToken;
            callback(HttpResponse::newHttpJsonResponse(response));
        }, {Post, Options});
    
    app().registerHandler("/api/game/join",
        [](const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
            // Handle OPTIONS preflight
            if (req->method() == Options) {
                auto resp = HttpResponse::newHttpResponse();
                resp->setStatusCode(k200OK);
                callback(resp);
                return;
            }
            
            auto json = req->getJsonObject();
            if (!json || !(*json).isMember("roomCode") || !(*json).isMember("playerName")) {
                Json::Value error;
                error["error"] = "Room code and player name required";
                auto resp = HttpResponse::newHttpJsonResponse(error);
                resp->setStatusCode(k400BadRequest);
                callback(resp);
                return;
            }
            
            std::string roomCode = (*json)["roomCode"].asString();
            auto* game = gameManager->getGame(roomCode);
            
            if (!game) {
                Json::Value error;
                error["error"] = "Game not found";
                auto resp = HttpResponse::newHttpJsonResponse(error);
                resp->setStatusCode(k404NotFound);
                callback(resp);
                return;
            }
            
            if (game->state != guts::GameState::LOBBY) {
                Json::Value error;
                error["error"] = "Game already started";
                auto resp = HttpResponse::newHttpJsonResponse(error);
                resp->setStatusCode(k400BadRequest);
                callback(resp);
                return;
            }
            
            if (game->players.size() >= 8) {
                Json::Value error;
                error["error"] = "Game is full";
                auto resp = HttpResponse::newHttpJsonResponse(error);
                resp->setStatusCode(k400BadRequest);
                callback(resp);
                return;
            }
            
            Json::Value response;
            response["playerToken"] = generateUUID();
            response["roomCode"] = roomCode;
            callback(HttpResponse::newHttpJsonResponse(response));
        }, {Post, Options});
    
    // Cleanup thread
    std::thread([&]() {
        while (true) {
            std::this_thread::sleep_for(std::chrono::minutes(5));
            gameManager->cleanupAbandonedGames();
        }
    }).detach();
    
    app().run();
    return 0;
}
