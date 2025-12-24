#include "GameManager.hpp"
#include <random>
#include <algorithm>
#include <thread>
#include <chrono>
#include <iostream>

namespace guts {

// Helper function to generate UUID
std::string generateUUID() {
    static std::random_device rd;
    static std::mt19937_64 gen(rd());
    static std::uniform_int_distribution<uint64_t> dis;
    
    uint64_t part1 = dis(gen);
    uint64_t part2 = dis(gen);
    
    char buffer[37];
    snprintf(buffer, sizeof(buffer),
        "%08lx-%04lx-%04lx-%04lx-%012lx",
        (part1 >> 32) & 0xFFFFFFFF,
        (part1 >> 16) & 0xFFFF,
        part1 & 0xFFFF,
        (part2 >> 48) & 0xFFFF,
        part2 & 0xFFFFFFFFFFFF);
    
    return std::string(buffer);
}

GameManager::GameManager(MessageCallback msgCallback, BroadcastCallback broadcastCallback)
    : sendMessage_(msgCallback), broadcastToRoom_(broadcastCallback) {
}

std::string GameManager::generateRoomCode() {
    static const char chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(0, sizeof(chars) - 2);
    
    std::string code;
    do {
        code.clear();
        for (int i = 0; i < 6; ++i) {
            code += chars[dis(gen)];
        }
    } while (games_.find(code) != games_.end());
    
    return code;
}

void GameManager::createGame(const std::string& roomCode, const std::string& hostToken) {
    games_[roomCode] = std::make_unique<Game>(roomCode, hostToken);
}

Game* GameManager::getGame(const std::string& roomCode) {
    auto it = games_.find(roomCode);
    return it != games_.end() ? it->second.get() : nullptr;
}

void GameManager::handleJoinRoom(const std::string& socketId, const nlohmann::json& data) {
    if (!data.contains("roomCode") || !data.contains("playerToken") || !data.contains("playerName")) {
        sendMessage_(socketId, "error", {{"message", "Missing required fields"}});
        return;
    }
    
    std::string roomCode = data["roomCode"];
    std::string playerToken = data["playerToken"];
    std::string playerName = data["playerName"];
    
    Game* game = getGame(roomCode);
    if (!game) {
        sendMessage_(socketId, "error", {{"message", "Game not found"}});
        return;
    }
    
    // Check if player already exists (reconnection)
    Player* player = game->findPlayerByToken(playerToken);
    
    if (!player) {
        // New player joining
        if (game->state != GameState::LOBBY) {
            sendMessage_(socketId, "error", {{"message", "Game already started"}});
            return;
        }
        
        if (game->players.size() >= 8) {
            sendMessage_(socketId, "error", {{"message", "Game is full"}});
            return;
        }
        
        Player newPlayer;
        newPlayer.id = generateUUID();
        newPlayer.token = playerToken;
        newPlayer.name = playerName;
        newPlayer.balance = 0.0;
        newPlayer.buyInAmount = 20.0;
        newPlayer.isHost = game->players.empty() && playerToken == game->hostToken;
        newPlayer.isActive = true;
        newPlayer.socketId = socketId;
        
        game->players.push_back(newPlayer);
        player = &game->players.back();
    } else {
        // Reconnection
        player->socketId = socketId;
        player->isActive = true;
        player->name = playerName;
        
        if (player->buyInAmount == 0) {
            player->buyInAmount = 20.0;
        }
        
        // If reconnecting during active game, send current game state
        // Only send round state if game is actually in a valid playing state
        if (game->state == GameState::PLAYING && game->round > 0) {
            nlohmann::json playersJson = nlohmann::json::array();
            for (const auto& p : game->players) {
                playersJson.push_back({
                    {"id", p.id},
                    {"name", p.name},
                    {"balance", p.balance},
                    {"isActive", p.isActive}
                });
            }
            
            sendMessage_(socketId, "round_started", {
                {"round", game->round},
                {"pot", game->pot},
                {"isNothingRound", game->isNothingRound},
                {"players", playersJson}
            });
            
            // Send player's cards if they have them (only if round is active)
            auto handIt = game->currentHands.find(player->id);
            if (handIt != game->currentHands.end() && !game->currentHands.empty()) {
                nlohmann::json cardsJson = nlohmann::json::array();
                for (const auto& card : handIt->second) {
                    cardsJson.push_back(card.toJson());
                }
                
                sendMessage_(socketId, "cards_dealt", {
                    {"cards", cardsJson},
                    {"round", game->round},
                    {"isNothingRound", game->isNothingRound},
                    {"playerId", player->id}
                });
                
                // Only send timer if we're in an active round with cards
                sendMessage_(socketId, "timer_started", {
                    {"duration", 30},
                    {"round", game->round}
                });
            }
        } else if (game->state == GameState::PLAYING && game->round == 0) {
            // Game state is invalid (playing but no round) - reset to lobby
            game->state = GameState::LOBBY;
            game->round = 0;
            game->pot = 0.0;
            game->decisions.clear();
            game->currentHands.clear();
        }
    }
    
    socketToPlayerId_[socketId] = player->id;
    socketToRoomCode_[socketId] = roomCode;
    game->lastActivity = std::chrono::system_clock::now();
    
    // Send confirmation to joining player
    nlohmann::json playersJson = nlohmann::json::array();
    for (const auto& p : game->players) {
        playersJson.push_back({
            {"id", p.id},
            {"name", p.name},
            {"isHost", p.isHost},
            {"balance", p.balance},
            {"buyInAmount", p.buyInAmount}
        });
    }
    
    sendMessage_(socketId, "room_joined", {
        {"playerId", player->id},
        {"players", playersJson},
        {"gameState", {
            {"state", game->state == GameState::LOBBY ? "lobby" : 
                     (game->state == GameState::PLAYING ? "playing" : "ended")},
            {"round", game->round},
            {"pot", game->pot},
            {"buyInAmount", player->buyInAmount}
        }}
    });
    
    // Notify all other players
    broadcastToRoom_(roomCode, "player_joined", {
        {"player", {
            {"id", player->id},
            {"name", player->name},
            {"isHost", player->isHost},
            {"balance", player->balance},
            {"buyInAmount", player->buyInAmount}
        }}
    });
}

void GameManager::handleSetBuyIn(const std::string& socketId, const nlohmann::json& data) {
    auto roomIt = socketToRoomCode_.find(socketId);
    if (roomIt == socketToRoomCode_.end()) return;
    
    auto playerIdIt = socketToPlayerId_.find(socketId);
    if (playerIdIt == socketToPlayerId_.end()) return;
    
    Game* game = getGame(roomIt->second);
    if (!game) return;
    
    Player* player = game->findPlayerById(playerIdIt->second);
    if (!player) return;
    
    if (!data.contains("buyInAmount")) return;
    
    double buyInAmount = data["buyInAmount"];
    if (buyInAmount < 5.0 || buyInAmount > 100.0) {
        sendMessage_(socketId, "error", {{"message", "Buy-in must be between $5 and $100"}});
        return;
    }
    
    player->buyInAmount = buyInAmount;
    
    nlohmann::json playersJson = nlohmann::json::array();
    for (const auto& p : game->players) {
        playersJson.push_back({
            {"id", p.id},
            {"name", p.name},
            {"isHost", p.isHost},
            {"balance", p.balance},
            {"buyInAmount", p.buyInAmount}
        });
    }
    
    broadcastToRoom_(game->roomCode, "buy_in_updated", {
        {"playerId", player->id},
        {"buyInAmount", buyInAmount},
        {"players", playersJson}
    });
}

void GameManager::handleStartGame(const std::string& socketId, const nlohmann::json& data) {
    auto roomIt = socketToRoomCode_.find(socketId);
    if (roomIt == socketToRoomCode_.end()) return;
    
    auto playerIdIt = socketToPlayerId_.find(socketId);
    if (playerIdIt == socketToPlayerId_.end()) return;
    
    Game* game = getGame(roomIt->second);
    if (!game) return;
    
    Player* player = game->findPlayerById(playerIdIt->second);
    if (!player || !player->isHost) {
        sendMessage_(socketId, "error", {{"message", "Only host can start game"}});
        return;
    }
    
    if (game->players.size() < 2) {
        sendMessage_(socketId, "error", {{"message", "Need at least 2 players to start"}});
        return;
    }
    
    // Validate all player buy-ins
    for (const auto& p : game->players) {
        if (p.buyInAmount < 5.0 || p.buyInAmount > 100.0) {
            sendMessage_(socketId, "error", {{"message", "All buy-ins must be between $5 and $100"}});
            return;
        }
    }
    
    game->state = GameState::PLAYING;
    game->round = 0;
    game->pot = 0.0;
    game->decisions.clear();
    game->currentHands.clear();
    game->deck.clear();
    game->isNothingRound = true;
    game->pendingGameEnd = false;
    
    // Set each player's balance to their individual buy-in amount
    for (auto& p : game->players) {
        p.balance = p.buyInAmount;
        p.isActive = true;
    }
    
    nlohmann::json playersJson = nlohmann::json::array();
    for (const auto& p : game->players) {
        playersJson.push_back({
            {"id", p.id},
            {"name", p.name},
            {"balance", p.balance},
            {"buyInAmount", p.buyInAmount}
        });
    }
    
    broadcastToRoom_(game->roomCode, "game_started", {{"players", playersJson}});
    
    // Start first round after a delay
    std::thread([this, roomCode = game->roomCode]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(2000));
        Game* g = getGame(roomCode);
        if (g) startNewRound(g);
    }).detach();
}

void GameManager::startNewRound(Game* game) {
    game->round++;
    game->isNothingRound = game->round <= 3;
    game->decisions.clear();
    game->currentHands.clear();
    
    // Check for players in debt
    std::vector<Player*> playersInDebt;
    for (auto& p : game->players) {
        if (p.balance < 0) {
            playersInDebt.push_back(&p);
        }
    }
    
    if (!playersInDebt.empty()) {
        nlohmann::json debtPlayersJson = nlohmann::json::array();
        for (const auto* p : playersInDebt) {
            debtPlayersJson.push_back({
                {"playerId", p->id},
                {"playerName", p->name},
                {"debtAmount", std::abs(p->balance)}
            });
            
            // Send debt notification to player
            if (!p->socketId.empty()) {
                sendMessage_(p->socketId, "player_in_debt", {
                    {"debtAmount", std::abs(p->balance)},
                    {"balance", p->balance}
                });
            }
        }
        
        broadcastToRoom_(game->roomCode, "round_blocked_debt", {
            {"playersInDebt", debtPlayersJson}
        });
        return;
    }
    
    // Get active players who can afford ante
    std::vector<Player*> activePlayers;
    for (auto& p : game->players) {
        if (p.balance >= game->ante) {
            activePlayers.push_back(&p);
        }
    }
    
    if (activePlayers.size() < 2) {
        // Players can't afford ante - need to buy back
        nlohmann::json lowFundsJson = nlohmann::json::array();
        for (auto& p : game->players) {
            if (p.balance < game->ante) {
                lowFundsJson.push_back({
                    {"playerId", p.id},
                    {"playerName", p.name},
                    {"currentBalance", p.balance},
                    {"neededAmount", game->ante}
                });
                
                if (!p.socketId.empty()) {
                    sendMessage_(p.socketId, "player_in_debt", {
                        {"debtAmount", 0},
                        {"balance", p.balance},
                        {"needsBuyBack", true},
                        {"anteAmount", game->ante}
                    });
                }
            }
        }
        
        broadcastToRoom_(game->roomCode, "round_blocked_debt", {
            {"playersLowOnFunds", lowFundsJson}
        });
        return;
    }
    
    // Collect antes
    for (auto* p : activePlayers) {
        p->balance -= game->ante;
        game->pot += game->ante;
    }
    
    // Eliminate players who can't afford ante
    for (auto& p : game->players) {
        if (p.balance < game->ante) {
            p.isActive = false;
        }
    }
    
    // Create and shuffle deck
    game->deck = GameLogic::createDeck();
    GameLogic::shuffleDeck(game->deck);
    
    // Deal cards to each active player
    for (auto* player : activePlayers) {
        auto cards = GameLogic::dealCards(game->deck, 3);
        game->currentHands[player->id] = cards;
        
        // Send cards to that player
        nlohmann::json cardsJson = nlohmann::json::array();
        for (const auto& card : cards) {
            cardsJson.push_back(card.toJson());
        }
        
        broadcastToRoom_(game->roomCode, "cards_dealt", {
            {"cards", cardsJson},
            {"round", game->round},
            {"isNothingRound", game->isNothingRound},
            {"playerId", player->id}
        });
    }
    
    // Broadcast round start (after small delay)
    std::thread([this, roomCode = game->roomCode]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(200));
        Game* g = getGame(roomCode);
        if (!g) return;
        
        nlohmann::json playersJson = nlohmann::json::array();
        for (const auto& p : g->players) {
            playersJson.push_back({
                {"id", p.id},
                {"name", p.name},
                {"balance", p.balance},
                {"isActive", p.isActive}
            });
        }
        
        broadcastToRoom_(roomCode, "round_started", {
            {"round", g->round},
            {"pot", g->pot},
            {"isNothingRound", g->isNothingRound},
            {"players", playersJson}
        });
        
        startDecisionTimer(g);
    }).detach();
}

void GameManager::startDecisionTimer(Game* game) {
    int currentRound = game->round;
    broadcastToRoom_(game->roomCode, "timer_started", {
        {"duration", 30},
        {"round", currentRound}
    });
    
    // Start 30-second timer
    std::thread([this, roomCode = game->roomCode, roundNumber = currentRound]() {
        for (int remaining = 30; remaining > 0; --remaining) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
            Game* g = getGame(roomCode);
            if (!g) return;
            
            // Only send tick if still on the same round
            if (g->round == roundNumber) {
                broadcastToRoom_(roomCode, "timer_tick", {
                    {"remaining", remaining - 1},
                    {"round", roundNumber}
                });
            } else {
                // Round changed, stop this timer thread
                return;
            }
        }
        
        Game* g = getGame(roomCode);
        // Only resolve if still on the same round
        if (g && g->round == roundNumber) {
            resolveRound(g);
        }
    }).detach();
}

void GameManager::handlePlayerDecision(const std::string& socketId, const nlohmann::json& data) {
    auto roomIt = socketToRoomCode_.find(socketId);
    if (roomIt == socketToRoomCode_.end()) return;
    
    auto playerIdIt = socketToPlayerId_.find(socketId);
    if (playerIdIt == socketToPlayerId_.end()) return;
    
    Game* game = getGame(roomIt->second);
    if (!game || game->state != GameState::PLAYING) return;
    
    if (!data.contains("decision")) return;
    
    std::string decision = data["decision"];
    if (decision != "hold" && decision != "drop") {
        sendMessage_(socketId, "error", {{"message", "Invalid decision"}});
        return;
    }
    
    Player* player = game->findPlayerById(playerIdIt->second);
    if (!player || !player->isActive) return;
    
    if (game->decisions.find(player->id) != game->decisions.end()) {
        sendMessage_(socketId, "error", {{"message", "Decision already made"}});
        return;
    }
    
    game->decisions[player->id] = decision;
    
    broadcastToRoom_(game->roomCode, "player_decided", {
        {"playerId", player->id},
        {"playerName", player->name}
    });
    
    // Check if all active players have decided
    auto activePlayers = game->getActivePlayers();
    if (game->decisions.size() == activePlayers.size()) {
        resolveRound(game);
    }
}

void GameManager::resolveRound(Game* game) {
    auto activePlayers = game->getActivePlayers();
    
    // Auto-drop players who didn't decide
    for (auto* p : activePlayers) {
        if (game->decisions.find(p->id) == game->decisions.end()) {
            game->decisions[p->id] = "drop";
        }
    }
    
    // Compile decisions
    nlohmann::json decisionsJson = nlohmann::json::array();
    for (auto* p : activePlayers) {
        auto decision = game->decisions[p->id];
        nlohmann::json cardData = nullptr;
        
        if (decision == "hold") {
            auto handIt = game->currentHands.find(p->id);
            if (handIt != game->currentHands.end()) {
                nlohmann::json cardsArray = nlohmann::json::array();
                for (const auto& card : handIt->second) {
                    cardsArray.push_back(card.toJson());
                }
                cardData = cardsArray;
            }
        }
        
        decisionsJson.push_back({
            {"playerId", p->id},
            {"playerName", p->name},
            {"decision", decision},
            {"cards", cardData}
        });
    }
    
    // Get holders
    std::vector<Player*> holders;
    for (auto* p : activePlayers) {
        if (game->decisions[p->id] == "hold") {
            holders.push_back(p);
        }
    }
    
    // Wait 2 seconds for animations
    std::thread([this, game, decisionsJson, holders, activePlayers]() mutable {
        std::this_thread::sleep_for(std::chrono::milliseconds(2000));
        
        if (holders.empty()) {
            // Everyone dropped - pot carries forward (ante was already collected at round start)
            // No additional deduction needed
            
            broadcastToRoom_(game->roomCode, "round_reveal", {
                {"decisions", decisionsJson},
                {"pot", game->pot}
            });
            
            // Check for debt
            std::vector<Player*> playersInDebt;
            for (auto& p : game->players) {
                if (p.balance < 0) {
                    playersInDebt.push_back(&p);
                }
            }
            
            nlohmann::json balancesJson = nlohmann::json::array();
            for (const auto& p : game->players) {
                balancesJson.push_back({
                    {"playerId", p.id},
                    {"balance", p.balance}
                });
            }
            
            broadcastToRoom_(game->roomCode, "all_dropped", {
                {"pot", game->pot},
                {"balances", balancesJson}
            });
            
            for (auto* p : playersInDebt) {
                if (!p->socketId.empty()) {
                    sendMessage_(p->socketId, "player_in_debt", {
                        {"debtAmount", std::abs(p->balance)},
                        {"balance", p->balance}
                    });
                }
            }
        } else if (holders.size() == 1) {
            // Single holder vs deck
            handleDeckShowdown(game, holders[0]);
        } else {
            // Multiple holders
            broadcastToRoom_(game->roomCode, "round_reveal", {
                {"decisions", decisionsJson},
                {"pot", game->pot}
            });
            
            std::this_thread::sleep_for(std::chrono::milliseconds(3000));
            handleMultipleHolders(game, holders);
        }
    }).detach();
}

void GameManager::handleMultipleHolders(Game* game, const std::vector<Player*>& holders) {
    struct EvaluatedHand {
        Player* player;
        HandEvaluation evaluation;
    };
    
    std::vector<EvaluatedHand> evaluatedHands;
    for (auto* player : holders) {
        auto handIt = game->currentHands.find(player->id);
        if (handIt != game->currentHands.end()) {
            auto eval = GameLogic::evaluateHand(handIt->second, game->isNothingRound);
            evaluatedHands.push_back({player, eval});
        }
    }
    
    // Sort by hand strength (best first)
    std::sort(evaluatedHands.begin(), evaluatedHands.end(),
        [](const EvaluatedHand& a, const EvaluatedHand& b) {
            return GameLogic::compareHands(a.evaluation, b.evaluation) > 0;
        });
    
    Player* winner = evaluatedHands[0].player;
    double currentPot = game->pot; // Store current pot before winner takes it
    double winAmount = currentPot;
    winner->balance += winAmount;
    
    nlohmann::json loserPaymentsJson = nlohmann::json::array();
    double newPotAddition = 0.0;
    
    // Each loser must match the current pot (before winner takes it)
    for (size_t i = 1; i < evaluatedHands.size(); ++i) {
        Player* loser = evaluatedHands[i].player;
        double payment = currentPot; // Each loser pays the pot amount
        loser->balance -= payment;
        newPotAddition += payment;
        
        loserPaymentsJson.push_back({
            {"playerId", loser->id},
            {"playerName", loser->name},
            {"amount", payment}
        });
    }
    
    // New pot is the sum of all loser payments
    game->pot = newPotAddition;
    
    // Check for debt
    std::vector<Player*> playersInDebt;
    for (auto& p : game->players) {
        if (p.balance < 0) {
            playersInDebt.push_back(&p);
        }
    }
    
    nlohmann::json winnerCardsJson = nlohmann::json::array();
    auto winnerHandIt = game->currentHands.find(winner->id);
    if (winnerHandIt != game->currentHands.end()) {
        for (const auto& card : winnerHandIt->second) {
            winnerCardsJson.push_back(card.toJson());
        }
    }
    
    nlohmann::json balancesJson = nlohmann::json::array();
    for (const auto& p : game->players) {
        balancesJson.push_back({
            {"playerId", p.id},
            {"balance", p.balance}
        });
    }
    
    broadcastToRoom_(game->roomCode, "multiple_holders_result", {
        {"winner", {
            {"playerId", winner->id},
            {"playerName", winner->name},
            {"cards", winnerCardsJson},
            {"handType", evaluatedHands[0].evaluation.typeName}
        }},
        {"winAmount", winAmount},
        {"loserPayments", loserPaymentsJson},
        {"newPot", game->pot},
        {"balances", balancesJson}
    });
    
    for (auto* p : playersInDebt) {
        if (!p->socketId.empty()) {
            sendMessage_(p->socketId, "player_in_debt", {
                {"debtAmount", std::abs(p->balance)},
                {"balance", p->balance}
            });
        }
    }
}

void GameManager::handleDeckShowdown(Game* game, Player* holder) {
    // Deal 3 cards to the deck
    auto deckCards = GameLogic::dealCards(game->deck, 3);
    
    auto playerHandIt = game->currentHands.find(holder->id);
    if (playerHandIt == game->currentHands.end()) return;
    
    const auto& playerCards = playerHandIt->second;
    
    auto playerEval = GameLogic::evaluateHand(playerCards, game->isNothingRound);
    auto deckEval = GameLogic::evaluateHand(deckCards, game->isNothingRound);
    
    int comparison = GameLogic::compareHands(playerEval, deckEval);
    bool playerWon = comparison > 0;
    
    nlohmann::json playerCardsJson = nlohmann::json::array();
    for (const auto& card : playerCards) {
        playerCardsJson.push_back(card.toJson());
    }
    
    nlohmann::json deckCardsJson = nlohmann::json::array();
    for (const auto& card : deckCards) {
        deckCardsJson.push_back(card.toJson());
    }
    
    broadcastToRoom_(game->roomCode, "single_holder_vs_deck", {
        {"player", {
            {"playerId", holder->id},
            {"playerName", holder->name}
        }},
        {"playerCards", playerCardsJson},
        {"playerHandType", static_cast<int>(playerEval.type)},
        {"deckCards", deckCardsJson},
        {"deckHandType", static_cast<int>(deckEval.type)}
    });
    
    std::thread([this, game, holder, playerWon]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(5000));
        
        if (playerWon) {
            // Player wins - game ends
            holder->balance += game->pot;
            
            broadcastToRoom_(game->roomCode, "deck_showdown_result", {
                {"playerWon", true},
                {"winner", {
                    {"playerId", holder->id},
                    {"playerName", holder->name}
                }},
                {"pot", game->pot},
                {"newBalance", holder->balance},
                {"gameEnded", true}
            });
            
            game->pendingGameEnd = true;
        } else {
            // Deck wins - player matches pot
            double matchAmount = game->pot;
            holder->balance -= matchAmount;
            game->pot += matchAmount;
            
            broadcastToRoom_(game->roomCode, "deck_showdown_result", {
                {"playerWon", false},
                {"loser", {
                    {"playerId", holder->id},
                    {"playerName", holder->name}
                }},
                {"matchAmount", matchAmount},
                {"pot", matchAmount},
                {"newPot", game->pot},
                {"newBalance", holder->balance},
                {"gameEnded", false}
            });
            
            if (holder->balance < 0) {
                if (!holder->socketId.empty()) {
                    sendMessage_(holder->socketId, "player_in_debt", {
                        {"debtAmount", std::abs(holder->balance)},
                        {"balance", holder->balance}
                    });
                }
            }
        }
    }).detach();
}

void GameManager::endGame(Game* game) {
    game->state = GameState::ENDED;
    
    // Sort players by balance
    auto standings = game->players;
    std::sort(standings.begin(), standings.end(),
        [](const Player& a, const Player& b) { return a.balance > b.balance; });
    
    nlohmann::json standingsJson = nlohmann::json::array();
    for (const auto& p : standings) {
        standingsJson.push_back({
            {"playerId", p.id},
            {"playerName", p.name},
            {"balance", p.balance},
            {"profit", p.balance - p.buyInAmount}
        });
    }
    
    nlohmann::json winnerJson = nullptr;
    if (!standings.empty()) {
        winnerJson = {
            {"playerId", standings[0].id},
            {"playerName", standings[0].name},
            {"finalBalance", standings[0].balance}
        };
    }
    
    broadcastToRoom_(game->roomCode, "game_ended", {
        {"finalStandings", standingsJson},
        {"winner", winnerJson},
        {"totalRounds", game->round}
    });
}

void GameManager::handleNextRound(const std::string& socketId, const nlohmann::json& data) {
    auto roomIt = socketToRoomCode_.find(socketId);
    if (roomIt == socketToRoomCode_.end()) return;
    
    auto playerIdIt = socketToPlayerId_.find(socketId);
    if (playerIdIt == socketToPlayerId_.end()) return;
    
    Game* game = getGame(roomIt->second);
    if (!game) return;
    
    Player* player = game->findPlayerById(playerIdIt->second);
    if (!player || !player->isHost) {
        sendMessage_(socketId, "error", {{"message", "Only host can continue to next round"}});
        return;
    }
    
    if (game->state == GameState::ENDED) {
        // Reset game to lobby
        game->state = GameState::LOBBY;
        game->round = 0;
        game->pot = 0.0;
        
        for (auto& p : game->players) {
            p.balance = 0.0;
            p.isActive = true;
        }
        
        nlohmann::json playersJson = nlohmann::json::array();
        for (const auto& p : game->players) {
            playersJson.push_back({
                {"id", p.id},
                {"name", p.name},
                {"isHost", p.isHost},
                {"balance", p.balance}
            });
        }
        
        broadcastToRoom_(game->roomCode, "game_reset", {{"players", playersJson}});
    } else if (game->state == GameState::PLAYING) {
        if (game->pendingGameEnd) {
            game->pendingGameEnd = false;
            endGame(game);
        } else {
            // Check for players in debt
            std::vector<Player*> playersInDebt;
            for (auto& p : game->players) {
                if (p.balance < 0) {
                    playersInDebt.push_back(&p);
                }
            }
            
            if (!playersInDebt.empty()) {
                for (auto* p : playersInDebt) {
                    if (!p->socketId.empty()) {
                        sendMessage_(p->socketId, "player_in_debt", {
                            {"debtAmount", std::abs(p->balance)},
                            {"balance", p->balance}
                        });
                    }
                }
                
                std::string names;
                for (size_t i = 0; i < playersInDebt.size(); ++i) {
                    if (i > 0) names += ", ";
                    names += playersInDebt[i]->name;
                }
                
                sendMessage_(socketId, "error", {
                    {"message", "Cannot start next round: " + names + 
                     (playersInDebt.size() == 1 ? " is" : " are") + 
                     " in debt and must buy back first."}
                });
                return;
            }
            
            startNewRound(game);
        }
    }
}

void GameManager::handleBuyBackIn(const std::string& socketId, const nlohmann::json& data) {
    auto roomIt = socketToRoomCode_.find(socketId);
    if (roomIt == socketToRoomCode_.end()) {
        sendMessage_(socketId, "error", {{"message", "Player not found"}});
        return;
    }
    
    auto playerIdIt = socketToPlayerId_.find(socketId);
    if (playerIdIt == socketToPlayerId_.end()) {
        sendMessage_(socketId, "error", {{"message", "Player not found"}});
        return;
    }
    
    Game* game = getGame(roomIt->second);
    if (!game) {
        sendMessage_(socketId, "error", {{"message", "Game not found"}});
        return;
    }
    
    Player* player = game->findPlayerById(playerIdIt->second);
    if (!player) {
        sendMessage_(socketId, "error", {{"message", "Player not found in game"}});
        return;
    }
    
    if (!data.contains("amount")) {
        sendMessage_(socketId, "buy_back_result", {
            {"success", false},
            {"message", "Invalid buy-back amount"},
            {"playerId", player->id},
            {"newBalance", player->balance}
        });
        return;
    }
    
    double amount = data["amount"];
    if (amount <= 0) {
        sendMessage_(socketId, "buy_back_result", {
            {"success", false},
            {"message", "Invalid buy-back amount"},
            {"playerId", player->id},
            {"newBalance", player->balance}
        });
        return;
    }
    
    double currentDebt = player->balance < 0 ? std::abs(player->balance) : 0;
    
    if (currentDebt > 0 && amount < currentDebt) {
        char buf[256];
        snprintf(buf, sizeof(buf), "You must buy back at least $%.2f to cover your debt", currentDebt);
        sendMessage_(socketId, "buy_back_result", {
            {"success", false},
            {"message", std::string(buf)},
            {"playerId", player->id},
            {"newBalance", player->balance}
        });
        return;
    }
    
    player->balance += amount;
    game->lastActivity = std::chrono::system_clock::now();
    
    sendMessage_(socketId, "buy_back_result", {
        {"success", true},
        {"message", "Buy-back successful!"},
        {"playerId", player->id},
        {"newBalance", player->balance}
    });
    
    broadcastToRoom_(game->roomCode, "player_balance_updated", {
        {"playerId", player->id},
        {"newBalance", player->balance},
        {"buyBackAmount", amount}
    });
}

void GameManager::handleLeaveGame(const std::string& socketId) {
    auto roomIt = socketToRoomCode_.find(socketId);
    if (roomIt == socketToRoomCode_.end()) return;
    
    auto playerIdIt = socketToPlayerId_.find(socketId);
    if (playerIdIt == socketToPlayerId_.end()) return;
    
    Game* game = getGame(roomIt->second);
    if (!game) return;
    
    Player* player = game->findPlayerById(playerIdIt->second);
    if (player) {
        // Only prevent leaving due to debt if actively playing
        // Always allow leaving from lobby (debt shouldn't exist in lobby anyway)
        if (game->state == GameState::PLAYING && player->balance < 0) {
            char buf[256];
            snprintf(buf, sizeof(buf), 
                "You cannot leave while in debt. You must buy back at least $%.2f first.",
                std::abs(player->balance));
            sendMessage_(socketId, "error", {{"message", std::string(buf)}});
            return;
        }
        
        if (game->state == GameState::LOBBY) {
            // Remove player from game
            std::string playerId = player->id;
            std::string playerName = player->name;
            bool wasHost = player->isHost;
            
            game->players.erase(
                std::remove_if(game->players.begin(), game->players.end(),
                    [&playerId](const Player& p) { return p.id == playerId; }),
                game->players.end());
            
            // Reassign host if needed
            if (wasHost && !game->players.empty()) {
                game->players[0].isHost = true;
            }
            
            broadcastToRoom_(game->roomCode, "player_left", {
                {"playerId", playerId},
                {"playerName", playerName}
            });
        } else {
            player->isActive = false;
            player->socketId = "";
        }
    }
    
    socketToPlayerId_.erase(socketId);
    socketToRoomCode_.erase(socketId);
    
    // Clean up empty games
    if (game->players.empty()) {
        games_.erase(game->roomCode);
    }
}

void GameManager::handleEndGame(const std::string& socketId) {
    auto roomIt = socketToRoomCode_.find(socketId);
    if (roomIt == socketToRoomCode_.end()) {
        sendMessage_(socketId, "error", {{"message", "Player not found"}});
        return;
    }
    
    auto playerIdIt = socketToPlayerId_.find(socketId);
    if (playerIdIt == socketToPlayerId_.end()) {
        sendMessage_(socketId, "error", {{"message", "Player not found"}});
        return;
    }
    
    Game* game = getGame(roomIt->second);
    if (!game) {
        sendMessage_(socketId, "error", {{"message", "Game not found"}});
        return;
    }
    
    Player* player = game->findPlayerById(playerIdIt->second);
    if (!player) {
        sendMessage_(socketId, "error", {{"message", "Player not in game"}});
        return;
    }
    
    if (!player->isHost) {
        sendMessage_(socketId, "error", {{"message", "Only the host can end the game"}});
        return;
    }
    
    endGame(game);
}

void GameManager::handleDisconnect(const std::string& socketId) {
    auto roomIt = socketToRoomCode_.find(socketId);
    if (roomIt == socketToRoomCode_.end()) return;
    
    auto playerIdIt = socketToPlayerId_.find(socketId);
    if (playerIdIt == socketToPlayerId_.end()) return;
    
    Game* game = getGame(roomIt->second);
    if (!game) return;
    
    Player* player = game->findPlayerById(playerIdIt->second);
    if (player) {
        player->isActive = false;
        player->socketId = "";
        
        // Auto-drop in current round if playing
        if (game->state == GameState::PLAYING && 
            game->decisions.find(player->id) == game->decisions.end()) {
            game->decisions[player->id] = "drop";
        }
    }
    
    socketToPlayerId_.erase(socketId);
    socketToRoomCode_.erase(socketId);
}

void GameManager::handlePlayerEmote(const std::string& socketId, const nlohmann::json& data) {
    auto roomIt = socketToRoomCode_.find(socketId);
    if (roomIt == socketToRoomCode_.end()) return;
    
    auto playerIdIt = socketToPlayerId_.find(socketId);
    if (playerIdIt == socketToPlayerId_.end()) return;
    
    Game* game = getGame(roomIt->second);
    if (!game) return;
    
    Player* player = game->findPlayerById(playerIdIt->second);
    if (!player) return;
    
    // Validate emote URL (should be in format /emotes/emote-XX.gif)
    if (!data.contains("emoteUrl")) return;
    std::string emoteUrl = data["emoteUrl"];
    
    // Basic validation - ensure it's an emote path
    if (emoteUrl.find("/emotes/emote-") == std::string::npos) {
        return; // Invalid emote path
    }
    
    // Broadcast emote to all players in the room
    broadcastToRoom_(game->roomCode, "player_emote", {
        {"playerId", player->id},
        {"playerName", player->name},
        {"emoteUrl", emoteUrl}
    });
}

void GameManager::cleanupAbandonedGames() {
    auto now = std::chrono::system_clock::now();
    auto timeout = std::chrono::minutes(5);
    
    std::vector<std::string> toRemove;
    for (const auto& [roomCode, game] : games_) {
        if (now - game->lastActivity > timeout) {
            std::cout << "Cleaning up abandoned game: " << roomCode << std::endl;
            toRemove.push_back(roomCode);
        }
    }
    
    for (const auto& roomCode : toRemove) {
        games_.erase(roomCode);
    }
}

} // namespace guts

