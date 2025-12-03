#include "GameLogic.hpp"
#include <openssl/rand.h>
#include <stdexcept>
#include <map>

namespace guts {

const std::array<std::string, 13> GameLogic::RANKS = {
    "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"
};

const std::array<Suit, 4> GameLogic::SUITS = {
    Suit::HEARTS, Suit::DIAMONDS, Suit::CLUBS, Suit::SPADES
};

static const std::map<std::string, int> RANK_VALUES = {
    {"2", 2}, {"3", 3}, {"4", 4}, {"5", 5}, {"6", 6}, {"7", 7}, {"8", 8},
    {"9", 9}, {"10", 10}, {"J", 11}, {"Q", 12}, {"K", 13}, {"A", 14}
};

std::vector<Card> GameLogic::createDeck() {
    std::vector<Card> deck;
    deck.reserve(52);
    
    for (const auto& suit : SUITS) {
        for (const auto& rank : RANKS) {
            deck.push_back({rank, suit, RANK_VALUES.at(rank)});
        }
    }
    
    return deck;
}

void GameLogic::shuffleDeck(std::vector<Card>& deck) {
    // Use Fisher-Yates shuffle with cryptographically secure random
    for (size_t i = deck.size() - 1; i > 0; --i) {
        // Generate cryptographically secure random index
        unsigned char randomBytes[4];
        if (RAND_bytes(randomBytes, 4) != 1) {
            throw std::runtime_error("Failed to generate secure random bytes");
        }
        
        uint32_t randomValue = 
            (static_cast<uint32_t>(randomBytes[0]) << 24) |
            (static_cast<uint32_t>(randomBytes[1]) << 16) |
            (static_cast<uint32_t>(randomBytes[2]) << 8) |
            static_cast<uint32_t>(randomBytes[3]);
        
        size_t j = randomValue % (i + 1);
        std::swap(deck[i], deck[j]);
    }
}

std::vector<Card> GameLogic::dealCards(std::vector<Card>& deck, size_t count) {
    if (deck.size() < count) {
        throw std::runtime_error("Not enough cards in deck");
    }
    
    std::vector<Card> dealt;
    dealt.reserve(count);
    
    for (size_t i = 0; i < count; ++i) {
        dealt.push_back(deck.back());
        deck.pop_back();
    }
    
    return dealt;
}

bool GameLogic::isFlush(const std::vector<Card>& cards) {
    if (cards.size() != 3) return false;
    return cards[0].suit == cards[1].suit && cards[1].suit == cards[2].suit;
}

bool GameLogic::isStraight(const std::vector<Card>& cards) {
    if (cards.size() != 3) return false;
    
    std::vector<int> values = {cards[0].value, cards[1].value, cards[2].value};
    std::sort(values.begin(), values.end());
    
    // Check for regular straight
    if (values[2] - values[1] == 1 && values[1] - values[0] == 1) {
        return true;
    }
    
    // Check for A-2-3 (special case)
    if (values[0] == 2 && values[1] == 3 && values[2] == 14) {
        return true;
    }
    
    return false;
}

bool GameLogic::isThreeOfKind(const std::vector<Card>& cards) {
    if (cards.size() != 3) return false;
    return cards[0].value == cards[1].value && cards[1].value == cards[2].value;
}

GameLogic::PairResult GameLogic::isPair(const std::vector<Card>& cards) {
    if (cards.size() != 3) return {false, 0, 0};
    
    std::vector<int> values = {cards[0].value, cards[1].value, cards[2].value};
    std::sort(values.begin(), values.end(), std::greater<int>());
    
    for (size_t i = 0; i < values.size() - 1; ++i) {
        for (size_t j = i + 1; j < values.size(); ++j) {
            if (values[i] == values[j]) {
                int kicker = 0;
                for (int v : values) {
                    if (v != values[i]) {
                        kicker = v;
                        break;
                    }
                }
                return {true, values[i], kicker};
            }
        }
    }
    
    return {false, 0, 0};
}

HandEvaluation GameLogic::evaluateHand(const std::vector<Card>& cards, bool isNothingRound) {
    if (cards.size() != 3) {
        throw std::invalid_argument("Hand must have exactly 3 cards");
    }
    
    // Sort cards by value (descending)
    std::vector<Card> sortedCards = cards;
    std::sort(sortedCards.begin(), sortedCards.end(), 
        [](const Card& a, const Card& b) { return a.value > b.value; });
    
    std::vector<int> values = {sortedCards[0].value, sortedCards[1].value, sortedCards[2].value};
    
    // Check for three of a kind (allowed in all rounds)
    if (isThreeOfKind(sortedCards)) {
        return {
            HandType::THREE_OF_KIND,
            getHandTypeName(HandType::THREE_OF_KIND),
            values[0],
            {values[0]}
        };
    }
    
    // In NOTHING rounds (1-3), only pairs and high cards count
    if (isNothingRound) {
        auto pairCheck = isPair(sortedCards);
        if (pairCheck.isPair) {
            return {
                HandType::PAIR,
                getHandTypeName(HandType::PAIR),
                pairCheck.pairRank,
                {pairCheck.pairRank, pairCheck.kicker}
            };
        }
        
        // High card
        return {
            HandType::HIGH_CARD,
            getHandTypeName(HandType::HIGH_CARD),
            values[0],
            values
        };
    }
    
    // Round 4+: Check for all hand types
    bool flush = isFlush(sortedCards);
    bool straight = isStraight(sortedCards);
    
    // Straight flush
    if (flush && straight) {
        return {
            HandType::STRAIGHT_FLUSH,
            getHandTypeName(HandType::STRAIGHT_FLUSH),
            values[0],
            {values[0]}
        };
    }
    
    // Straight
    if (straight) {
        // Handle A-2-3 straight (wheel)
        int straightHigh = (values[0] == 14 && values[1] == 3 && values[2] == 2) ? 3 : values[0];
        return {
            HandType::STRAIGHT,
            getHandTypeName(HandType::STRAIGHT),
            straightHigh,
            {straightHigh}
        };
    }
    
    // Flush
    if (flush) {
        return {
            HandType::FLUSH,
            getHandTypeName(HandType::FLUSH),
            values[0],
            values
        };
    }
    
    // Pair
    auto pairCheck = isPair(sortedCards);
    if (pairCheck.isPair) {
        return {
            HandType::PAIR,
            getHandTypeName(HandType::PAIR),
            pairCheck.pairRank,
            {pairCheck.pairRank, pairCheck.kicker}
        };
    }
    
    // High card
    return {
        HandType::HIGH_CARD,
        getHandTypeName(HandType::HIGH_CARD),
        values[0],
        values
    };
}

int GameLogic::compareHands(const HandEvaluation& hand1, const HandEvaluation& hand2) {
    // First compare hand types
    if (static_cast<int>(hand1.type) > static_cast<int>(hand2.type)) return 1;
    if (static_cast<int>(hand1.type) < static_cast<int>(hand2.type)) return -1;
    
    // Same hand type - compare tiebreakers
    size_t minSize = std::min(hand1.tiebreakers.size(), hand2.tiebreakers.size());
    for (size_t i = 0; i < minSize; ++i) {
        if (hand1.tiebreakers[i] > hand2.tiebreakers[i]) return 1;
        if (hand1.tiebreakers[i] < hand2.tiebreakers[i]) return -1;
    }
    
    // Exact tie
    return 0;
}

} // namespace guts

