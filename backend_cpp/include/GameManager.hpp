#pragma once

#include "Game.hpp"
#include "GameLogic.hpp"
#include <map>
#include <memory>
#include <string>
#include <functional>
#include <nlohmann/json.hpp>

namespace guts {

using MessageCallback = std::function<void(const std::string& socketId, const std::string& event, const nlohmann::json& data)>;
using BroadcastCallback = std::function<void(const std::string& roomCode, const std::string& event, const nlohmann::json& data)>;

class GameManager {
public:
    GameManager(MessageCallback msgCallback, BroadcastCallback broadcastCallback);
    
    // Game management
    std::string generateRoomCode();
    void createGame(const std::string& roomCode, const std::string& hostToken);
    Game* getGame(const std::string& roomCode);
    
    // Event handlers
    void handleJoinRoom(const std::string& socketId, const nlohmann::json& data);
    void handleSetBuyIn(const std::string& socketId, const nlohmann::json& data);
    void handleStartGame(const std::string& socketId, const nlohmann::json& data);
    void handlePlayerDecision(const std::string& socketId, const nlohmann::json& data);
    void handleNextRound(const std::string& socketId, const nlohmann::json& data);
    void handleBuyBackIn(const std::string& socketId, const nlohmann::json& data);
    void handleLeaveGame(const std::string& socketId);
    void handleEndGame(const std::string& socketId);
    void handleDisconnect(const std::string& socketId);
    
    // Cleanup
    void cleanupAbandonedGames();

private:
    void startNewRound(Game* game);
    void startDecisionTimer(Game* game);
    void resolveRound(Game* game);
    void handleMultipleHolders(Game* game, const std::vector<Player*>& holders);
    void handleDeckShowdown(Game* game, Player* holder);
    void endGame(Game* game);
    
    std::map<std::string, std::unique_ptr<Game>> games_;
    std::map<std::string, std::string> socketToPlayerId_; // socketId -> playerId
    std::map<std::string, std::string> socketToRoomCode_; // socketId -> roomCode
    
    MessageCallback sendMessage_;
    BroadcastCallback broadcastToRoom_;
};

} // namespace guts

