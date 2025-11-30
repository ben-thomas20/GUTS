# Testing Guide - Guts Card Game

Comprehensive testing checklist and scenarios for the Guts card game.

## 🧪 Quick Test (2 Players, Local)

### Setup
1. Open two browser windows/tabs side by side
2. Tab 1: Create game as "Alice"
3. Tab 2: Join with room code as "Bob"
4. Alice: Start game with $20 buy-in

### Test Scenario 1: Multiple Holders
1. **Round 1** (NOTHING round):
   - Both hold
   - See results (best hand wins)
   - Verify loser's balance decreased by pot amount
   - Verify pot carries to next round

2. **Round 2** (NOTHING round):
   - One holds, one drops
   - Should trigger THE DECK showdown
   - Verify THE DECK cards are displayed
   - Test both outcomes:
     - If player wins → game ends
     - If THE DECK wins → game continues

### Test Scenario 2: All Drop
1. **Any round**:
   - Both players drop
   - Verify pot carries over
   - Verify no penalties applied
   - Verify next round starts

### Test Scenario 3: Round 4+ (Normal Hands)
1. **Round 4**:
   - Verify "NOTHING" indicator is gone
   - Hold with different hand types
   - Verify straights and flushes now count

## 🎮 Full Game Test (4-8 Players)

### Setup
1. Open 4 browser tabs
2. Create game + 3 players join
3. Start with $20 buy-in

### Test Cases

#### TC1: Player Elimination
1. Let one player lose multiple rounds
2. Verify balance turns yellow (<$5), then red (<$1)
3. Verify player eliminated when balance < $0.50
4. Verify game continues with remaining players

#### TC2: THE DECK Win Condition
1. Engineer scenario with single holder
2. Verify THE DECK cards dealt from remaining deck
3. If player wins:
   - ✓ Game ends immediately
   - ✓ Winner receives pot
   - ✓ Final standings displayed
   - ✓ Winner highlighted
   - ✓ All balances shown

#### TC3: THE DECK Loss
1. Single holder with weak hand
2. THE DECK wins
3. Verify:
   - ✓ Player's balance decreased by pot
   - ✓ Pot doubled for next round
   - ✓ Game continues
   - ✓ New round starts

#### TC4: Pot Accumulation
1. Multiple rounds with losers matching
2. Track pot growth:
   - Round 1: $2.00 (4 × $0.50 ante)
   - Loser matches: $2.00 added → Round 2: $4.00 + $2.00 ante
   - Continue tracking
3. Verify math is correct at each step

#### TC5: Hand Rankings - NOTHING Rounds

Test hands in rounds 1-3:
```
Three Aces    vs  Pair of Kings  → Three Aces win
Pair of Aces  vs  Pair of Kings  → Pair of Aces win
Pair of 2s    vs  Ace high       → Pair of 2s win
King high     vs  Queen high     → King high wins
Flush (any)   vs  Pair           → Pair wins (flush doesn't count!)
Straight      vs  Pair           → Pair wins (straight doesn't count!)
```

#### TC6: Hand Rankings - Normal Rounds (4+)

Test hands in round 4+:
```
Straight Flush  vs  Three of Kind    → Straight Flush wins
Three of Kind   vs  Straight         → Three of Kind wins
Straight        vs  Flush            → Straight wins
Flush           vs  Pair             → Flush wins
Pair            vs  High Card        → Pair wins
```

## 📱 Mobile Testing

### iOS Safari Testing

#### Setup
1. Get computer's local IP
2. Update .env files with IP
3. Connect iPhone/iPad to same WiFi
4. Access `http://YOUR_IP:5173`

#### Test Cases

**TC-M1: Touch Interactions**
- ✓ All buttons are tappable (44×44px minimum)
- ✓ No accidental zooming
- ✓ Swipe gestures don't interfere
- ✓ Hold/Drop buttons respond to touch
- ✓ Input fields bring up keyboard correctly

**TC-M2: Orientation**
- ✓ Portrait mode works
- ✓ Landscape mode works
- ✓ Rotation handled gracefully
- ✓ Layout adapts correctly

**TC-M3: Safari Features**
- ✓ Add to Home Screen works
- ✓ Runs in fullscreen (web app mode)
- ✓ Status bar handled correctly
- ✓ Safe area insets respected (iPhone X+)
- ✓ No address bar scroll issues

**TC-M4: Network Handling**
- ✓ Stable connection maintained
- ✓ Reconnection after WiFi blip
- ✓ Error message on disconnect
- ✓ Game state recovers after reconnect

**TC-M5: Multi-Device Sync**
- ✓ Cards appear simultaneously on all devices
- ✓ Timer syncs across devices
- ✓ Decisions revealed simultaneously
- ✓ Balance updates in real-time

## 🔒 Security Testing

### SEC1: Card Privacy
**Critical Test**: Can one player see another's cards?

1. Open browser DevTools
2. Monitor WebSocket messages
3. Verify:
   - ✓ Only receive your own cards
   - ✓ Can't see other players' cards in network traffic
   - ✓ Cards only revealed after HOLD decision

### SEC2: Decision Manipulation
**Try to cheat**:
1. Open console during decision phase
2. Attempt to:
   - Change decision after submitting → ✓ Should fail
   - Submit decision twice → ✓ Should reject
   - Submit after timer → ✓ Should auto-drop

### SEC3: Room Access
1. Try to join full room (8 players) → ✓ Should reject
2. Try to join started game → ✓ Should reject
3. Try to join with invalid room code → ✓ Should show error
4. Try to start game as non-host → ✓ Should reject

### SEC4: Input Validation
1. Player name: Test empty, very long (>20 chars), special chars
2. Room code: Test invalid formats, SQL injection attempts
3. Buy-in: Test negative, zero, >$100, decimals

### SEC5: Rate Limiting
1. Rapidly create multiple games
2. Should get rate limited after ~30 requests/minute
3. Verify 429 status code returned

## ⚡ Performance Testing

### PERF1: Large Pot Calculations
1. Engineer scenario with pot > $100
2. Verify calculations remain accurate
3. Check for floating-point errors

### PERF2: Long Game Session
1. Play 20+ rounds
2. Monitor memory usage (DevTools)
3. Check for memory leaks
4. Verify no slowdown

### PERF3: 8-Player Game
1. Create game with maximum 8 players
2. Play multiple rounds
3. Monitor:
   - ✓ WebSocket message sizes
   - ✓ Latency between decision and reveal
   - ✓ Server CPU/memory usage
   - ✓ Client rendering performance

### PERF4: Network Quality
Test on various connections:
- ✓ Fast WiFi (50+ Mbps)
- ✓ Slow WiFi (2-5 Mbps)
- ✓ 4G mobile
- ✓ 3G mobile (if possible)

## 🐛 Edge Cases

### EDGE1: Exact Ties
Test hands that tie:
```
Player A: K♠ K♥ 5♣
Player B: K♦ K♣ 5♠
→ Should be exact tie (verify tiebreaker logic)
```

### EDGE2: Disconnection Scenarios
1. Player disconnects during decision phase → ✓ Auto-drop
2. Host disconnects in lobby → ✓ Transfer host or end game
3. All players disconnect → ✓ Game cleanup after timeout
4. Reconnect after decision made → ✓ See results when ready

### EDGE3: Rapid Actions
1. Click Hold/Drop rapidly → ✓ Only first counts
2. Host clicks Start Game multiple times → ✓ Only starts once
3. Multiple players join simultaneously → ✓ All join successfully

### EDGE4: Browser Compatibility
Test on:
- ✓ Chrome (macOS, Windows, Android)
- ✓ Safari (macOS, iOS)
- ✓ Firefox (macOS, Windows)
- ✓ Edge (Windows)

### EDGE5: Unusual Buy-ins
- Minimum ($5) → ✓ Works correctly
- Maximum ($100) → ✓ Works correctly
- Non-standard ($17.50) → ✓ Calculations accurate
- Boundary ($4.99, $100.01) → ✓ Rejected

## 📊 Test Results Template

Use this checklist for each test run:

```
Date: __________
Tester: __________
Environment: [ ] Local [ ] Production
Browsers tested: __________

Basic Functionality:
[ ] Create game
[ ] Join game
[ ] Start game
[ ] Cards dealt correctly
[ ] Timer works
[ ] Hold/Drop decisions
[ ] Results display
[ ] Pot calculations
[ ] Balance updates

Game Scenarios:
[ ] Multiple holders
[ ] Single holder vs DECK (win)
[ ] Single holder vs DECK (loss)
[ ] All drop
[ ] Player elimination
[ ] NOTHING rounds (1-3)
[ ] Normal rounds (4+)
[ ] Game end

Mobile:
[ ] iOS Safari
[ ] Android Chrome
[ ] Touch interactions
[ ] Orientation changes
[ ] Add to home screen

Security:
[ ] Card privacy
[ ] Decision validation
[ ] Room access control
[ ] Input sanitization

Performance:
[ ] 8-player game
[ ] 20+ rounds
[ ] No memory leaks
[ ] Acceptable latency

Issues Found:
_________________________________
_________________________________
_________________________________
```

## 🔧 Automated Testing (Future)

### Unit Tests to Write

**Backend (gameLogic.js)**:
```javascript
describe('Hand Evaluation', () => {
  test('evaluates three of a kind correctly')
  test('evaluates pair correctly')
  test('evaluates flush correctly (normal rounds only)')
  test('evaluates straight correctly (normal rounds only)')
  test('straight flush beats three of kind')
  test('NOTHING rounds ignore flushes')
  test('NOTHING rounds ignore straights')
})

describe('Hand Comparison', () => {
  test('compares same hand types by rank')
  test('handles exact ties')
  test('ace is highest card')
})

describe('Deck Operations', () => {
  test('shuffled deck has 52 unique cards')
  test('dealing removes cards from deck')
  test('shuffle is cryptographically random')
})
```

**Backend (gameManager.js)**:
```javascript
describe('Game Flow', () => {
  test('collects antes correctly')
  test('calculates pot after multiple holders lose')
  test('THE DECK deals from remaining cards')
  test('player elimination at $0.50 threshold')
  test('game ends when single holder beats DECK')
})
```

**Frontend (Components)**:
```javascript
describe('Card Component', () => {
  test('renders card with correct suit symbol')
  test('applies correct color for red/black suits')
})

describe('Timer Component', () => {
  test('countdown displays correctly')
  test('color changes at thresholds (3s, 6s)')
})
```

## 📝 Manual Test Script

Follow this exact sequence for complete test:

1. **Setup (2 min)**
   - Start app: `npm run dev`
   - Open 3 tabs
   - Create + join game

2. **Test NOTHING Rounds (3 min)**
   - Play rounds 1-3
   - Verify only pairs count
   - Test flush/straight don't count

3. **Test Normal Rounds (3 min)**
   - Reach round 4
   - Verify all hands count
   - Test various hand combinations

4. **Test THE DECK (5 min)**
   - Engineer single holder scenario
   - Test win condition
   - Test loss condition
   - Verify game end on win

5. **Test Edge Cases (5 min)**
   - All drop
   - Player disconnection
   - Rapid button clicks
   - Invalid inputs

6. **Mobile Test (5 min)**
   - Access from phone
   - Play full round
   - Test orientation
   - Test touch interactions

**Total Time: ~25 minutes**

## ✅ Definition of Done

The application is considered fully tested when:

- [ ] All basic functionality tests pass
- [ ] All game scenarios tested
- [ ] Mobile tested on iOS and Android
- [ ] Security tests show no vulnerabilities
- [ ] No memory leaks in 20+ round game
- [ ] 8-player game runs smoothly
- [ ] THE DECK scenarios work correctly
- [ ] All edge cases handled gracefully
- [ ] No errors in browser console
- [ ] No errors in server logs

---

**Happy Testing! 🧪**

Report any issues found during testing with steps to reproduce.

