#pragma once

#include "Card.hpp"
#include <vector>
#include <algorithm>
#include <random>

namespace guts {

class GameLogic {
public:
    // Create a standard 52-card deck
    static std::vector<Card> createDeck();
    
    // Shuffle deck using cryptographically secure random
    static void shuffleDeck(std::vector<Card>& deck);
    
    // Deal specified number of cards from deck
    static std::vector<Card> dealCards(std::vector<Card>& deck, size_t count);
    
    // Evaluate a 3-card hand
    static HandEvaluation evaluateHand(const std::vector<Card>& cards, bool isNothingRound = false);
    
    // Compare two evaluated hands
    // Returns: 1 if hand1 wins, -1 if hand2 wins, 0 if tie
    static int compareHands(const HandEvaluation& hand1, const HandEvaluation& hand2);

private:
    static bool isFlush(const std::vector<Card>& cards);
    static bool isStraight(const std::vector<Card>& cards);
    static bool isThreeOfKind(const std::vector<Card>& cards);
    
    struct PairResult {
        bool isPair;
        int pairRank;
        int kicker;
    };
    static PairResult isPair(const std::vector<Card>& cards);
    
    static const std::array<std::string, 13> RANKS;
    static const std::array<Suit, 4> SUITS;
};

} // namespace guts

