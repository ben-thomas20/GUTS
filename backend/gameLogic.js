const crypto = require('crypto');

// Card ranks and suits
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Hand type rankings
const HAND_TYPES = {
  HIGH_CARD: 1,
  PAIR: 2,
  FLUSH: 3,
  STRAIGHT: 4,
  THREE_OF_KIND: 5,
  STRAIGHT_FLUSH: 6
};

const HAND_TYPE_NAMES = {
  1: 'High Card',
  2: 'Pair',
  3: 'Flush',
  4: 'Straight',
  5: 'Three of a Kind',
  6: 'Straight Flush'
};

/**
 * Create a standard 52-card deck
 */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        rank,
        suit,
        value: RANK_VALUES[rank]
      });
    }
  }
  return deck;
}

/**
 * Shuffle deck using cryptographically secure random
 */
function shuffleDeck(deck) {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate cryptographically secure random index
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0);
    const j = randomValue % (i + 1);
    
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Deal specified number of cards from deck
 */
function dealCards(deck, count) {
  return deck.splice(0, count);
}

/**
 * Check if hand is a flush
 */
function isFlush(cards) {
  return cards.every(card => card.suit === cards[0].suit);
}

/**
 * Check if hand is a straight
 */
function isStraight(cards) {
  const values = cards.map(c => c.value).sort((a, b) => a - b);
  
  // Check for regular straight
  if (values[2] - values[1] === 1 && values[1] - values[0] === 1) {
    return true;
  }
  
  // Check for A-2-3 (special case)
  if (values[0] === 2 && values[1] === 3 && values[2] === 14) {
    return true;
  }
  
  return false;
}

/**
 * Check if hand has a pair and return pair details
 */
function isPair(cards) {
  const values = cards.map(c => c.value).sort((a, b) => b - a);
  
  for (let i = 0; i < values.length - 1; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] === values[j]) {
        const kicker = values.find(v => v !== values[i]);
        return { isPair: true, pairRank: values[i], kicker };
      }
    }
  }
  
  return { isPair: false };
}

/**
 * Check if hand is three of a kind
 */
function isThreeOfKind(cards) {
  const values = cards.map(c => c.value);
  return values[0] === values[1] && values[1] === values[2];
}

/**
 * Evaluate a 3-card hand
 * @param {Array} cards - Array of 3 card objects
 * @param {boolean} isNothingRound - Whether this is a NOTHING round (rounds 1-3)
 * @returns {Object} Hand evaluation with type and tiebreakers
 */
function evaluateHand(cards, isNothingRound = false) {
  if (!cards || cards.length !== 3) {
    throw new Error('Hand must have exactly 3 cards');
  }
  
  const sortedCards = [...cards].sort((a, b) => b.value - a.value);
  const values = sortedCards.map(c => c.value);
  
  // Check for three of a kind (allowed in all rounds)
  if (isThreeOfKind(sortedCards)) {
    return {
      type: HAND_TYPES.THREE_OF_KIND,
      typeName: HAND_TYPE_NAMES[HAND_TYPES.THREE_OF_KIND],
      rank: values[0],
      tiebreakers: [values[0]]
    };
  }
  
  // In NOTHING rounds (1-3), only pairs and high cards count
  if (isNothingRound) {
    const pairCheck = isPair(sortedCards);
    if (pairCheck.isPair) {
      return {
        type: HAND_TYPES.PAIR,
        typeName: HAND_TYPE_NAMES[HAND_TYPES.PAIR],
        rank: pairCheck.pairRank,
        tiebreakers: [pairCheck.pairRank, pairCheck.kicker]
      };
    }
    
    // High card
    return {
      type: HAND_TYPES.HIGH_CARD,
      typeName: HAND_TYPE_NAMES[HAND_TYPES.HIGH_CARD],
      rank: values[0],
      tiebreakers: values
    };
  }
  
  // Round 4+: Check for all hand types
  const flush = isFlush(sortedCards);
  const straight = isStraight(sortedCards);
  
  // Straight flush
  if (flush && straight) {
    return {
      type: HAND_TYPES.STRAIGHT_FLUSH,
      typeName: HAND_TYPE_NAMES[HAND_TYPES.STRAIGHT_FLUSH],
      rank: values[0],
      tiebreakers: [values[0]]
    };
  }
  
  // Straight
  if (straight) {
    // Handle A-2-3 straight (wheel)
    const straightHigh = (values[0] === 14 && values[1] === 3 && values[2] === 2) ? 3 : values[0];
    return {
      type: HAND_TYPES.STRAIGHT,
      typeName: HAND_TYPE_NAMES[HAND_TYPES.STRAIGHT],
      rank: straightHigh,
      tiebreakers: [straightHigh]
    };
  }
  
  // Flush
  if (flush) {
    return {
      type: HAND_TYPES.FLUSH,
      typeName: HAND_TYPE_NAMES[HAND_TYPES.FLUSH],
      rank: values[0],
      tiebreakers: values
    };
  }
  
  // Pair
  const pairCheck = isPair(sortedCards);
  if (pairCheck.isPair) {
    return {
      type: HAND_TYPES.PAIR,
      typeName: HAND_TYPE_NAMES[HAND_TYPES.PAIR],
      rank: pairCheck.pairRank,
      tiebreakers: [pairCheck.pairRank, pairCheck.kicker]
    };
  }
  
  // High card
  return {
    type: HAND_TYPES.HIGH_CARD,
    typeName: HAND_TYPE_NAMES[HAND_TYPES.HIGH_CARD],
    rank: values[0],
    tiebreakers: values
  };
}

/**
 * Compare two evaluated hands
 * @returns {number} 1 if hand1 wins, -1 if hand2 wins, 0 if tie
 */
function compareHands(hand1, hand2) {
  // First compare hand types
  if (hand1.type > hand2.type) return 1;
  if (hand1.type < hand2.type) return -1;
  
  // Same hand type - compare tiebreakers
  for (let i = 0; i < hand1.tiebreakers.length; i++) {
    if (hand1.tiebreakers[i] > hand2.tiebreakers[i]) return 1;
    if (hand1.tiebreakers[i] < hand2.tiebreakers[i]) return -1;
  }
  
  // Exact tie
  return 0;
}

module.exports = {
  createDeck,
  shuffleDeck,
  dealCards,
  isFlush,
  isStraight,
  isPair,
  isThreeOfKind,
  evaluateHand,
  compareHands,
  HAND_TYPES,
  HAND_TYPE_NAMES
};

