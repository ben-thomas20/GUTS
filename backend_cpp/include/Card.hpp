#pragma once

#include <string>
#include <vector>
#include <array>
#include <nlohmann/json.hpp>

namespace guts {

enum class Suit {
    HEARTS = 0,
    DIAMONDS = 1,
    CLUBS = 2,
    SPADES = 3
};

struct Card {
    std::string rank;
    Suit suit;
    int value;
    
    std::string getSuitString() const {
        switch (suit) {
            case Suit::HEARTS: return "hearts";
            case Suit::DIAMONDS: return "diamonds";
            case Suit::CLUBS: return "clubs";
            case Suit::SPADES: return "spades";
        }
        return "unknown";
    }
    
    nlohmann::json toJson() const {
        return {
            {"rank", rank},
            {"suit", getSuitString()},
            {"value", value}
        };
    }
};

enum class HandType {
    HIGH_CARD = 1,
    PAIR = 2,
    FLUSH = 3,
    STRAIGHT = 4,
    THREE_OF_KIND = 5,
    STRAIGHT_FLUSH = 6
};

inline std::string getHandTypeName(HandType type) {
    switch (type) {
        case HandType::HIGH_CARD: return "High Card";
        case HandType::PAIR: return "Pair";
        case HandType::FLUSH: return "Flush";
        case HandType::STRAIGHT: return "Straight";
        case HandType::THREE_OF_KIND: return "Three of a Kind";
        case HandType::STRAIGHT_FLUSH: return "Straight Flush";
    }
    return "Unknown";
}

struct HandEvaluation {
    HandType type;
    std::string typeName;
    int rank;
    std::vector<int> tiebreakers;
};

} // namespace guts

