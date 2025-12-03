#pragma once

#include "Player.hpp"
#include "Card.hpp"
#include <string>
#include <vector>
#include <map>
#include <memory>
#include <chrono>

namespace guts {

enum class GameState {
    LOBBY,
    PLAYING,
    ENDED
};

struct Game {
    std::string roomCode;
    std::string hostToken;
    GameState state;
    std::vector<Player> players;
    double buyInAmount;
    double ante;
    double pot;
    int round;
    std::vector<Card> deck;
    std::map<std::string, std::vector<Card>> currentHands; // playerId -> cards
    std::map<std::string, std::string> decisions; // playerId -> decision ("hold" or "drop")
    std::chrono::system_clock::time_point lastActivity;
    bool isNothingRound;
    bool pendingGameEnd;
    
    Game(const std::string& code, const std::string& host)
        : roomCode(code), hostToken(host), state(GameState::LOBBY),
          buyInAmount(20.0), ante(0.50), pot(0.0), round(0),
          lastActivity(std::chrono::system_clock::now()),
          isNothingRound(true), pendingGameEnd(false) {}
    
    Player* findPlayerById(const std::string& playerId) {
        for (auto& player : players) {
            if (player.id == playerId) return &player;
        }
        return nullptr;
    }
    
    Player* findPlayerByToken(const std::string& token) {
        for (auto& player : players) {
            if (player.token == token) return &player;
        }
        return nullptr;
    }
    
    Player* findPlayerBySocketId(const std::string& socketId) {
        for (auto& player : players) {
            if (player.socketId == socketId) return &player;
        }
        return nullptr;
    }
    
    std::vector<Player*> getActivePlayers() {
        std::vector<Player*> active;
        for (auto& player : players) {
            if (player.isActive) active.push_back(&player);
        }
        return active;
    }
};

} // namespace guts

