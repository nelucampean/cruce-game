import { Injectable } from '@angular/core';
import { Card, Suit, Player, GameState, CRUCE_RULES } from '../models/card.model';

@Injectable({
  providedIn: 'root'
})
export class CruceRulesService {

  private leadingPlayerIndex = 0;

  constructor() { }

  // Get the correct card rank for trick-taking (not the same as points!)
  private getCardRank(card: Card): number {
    // In Cruce, the trick-taking hierarchy is: As > 10 > King > Queen > 9 > 2
    const rankMap: { [key: number]: number } = {
      2: 1,   // Doiar (lowest)
      9: 2,   // Nouar 
      3: 3,   // Treiar (Queen)
      4: 4,   // Pătrar (King) 
      10: 5,  // Zecar
      11: 6   // As (highest)
    };
    return rankMap[card.value] || 0;
  }

  // Validate if a card can be played according to Cruce rules
  isCardPlayable(card: Card, gameState: GameState): boolean {
    const { currentTrick, trumpSuit, currentPlayer, players } = gameState;
    const playerHand = players[currentPlayer].hand;

    // Can always play any card when leading (first card of trick)
    if (currentTrick.length === 0) {
      return true;
    }

    const leadSuit = currentTrick[0].suit;
    
    // Rule 1: Must follow suit if possible
    const hasSuit = playerHand.some(c => c.suit === leadSuit);
    if (hasSuit) {
      return card.suit === leadSuit;
    }

    // Rule 2: If can't follow suit, must play trump if available
    if (trumpSuit && leadSuit !== trumpSuit) {
      const hasTrump = playerHand.some(c => c.suit === trumpSuit);
      if (hasTrump) {
        return card.suit === trumpSuit;
      }
    }

    // Rule 3: If can't follow suit and no trump, can play any card
    return true;
  }

  // Determine the winner of a completed trick
  // Returns the position in the trick (0-3), NOT the actual player index
  // The caller must adjust this based on who led the trick
  determineTrickWinner(trick: Card[], trumpSuit: Suit | null): number {
    if (trick.length !== 4) {
      throw new Error('Trick must have exactly 4 cards');
    }

    const leadSuit = trick[0].suit;
    
    // Find highest trump card if any trump was played
    if (trumpSuit) {
      const trumpCards = trick
        .map((card, index) => ({ card, index, rank: this.getCardRank(card) }))
        .filter(item => item.card.suit === trumpSuit);
      
      if (trumpCards.length > 0) {
        return trumpCards.reduce((highest, current) => 
          current.rank > highest.rank ? current : highest
        ).index;
      }
    }

    // Find highest card of lead suit
    const leadSuitCards = trick
      .map((card, index) => ({ card, index, rank: this.getCardRank(card) }))
      .filter(item => item.card.suit === leadSuit);

    if (leadSuitCards.length === 0) {
      // This shouldn't happen in valid play, but return first player as fallback
      return 0;
    }

    return leadSuitCards.reduce((highest, current) => 
      current.rank > highest.rank ? current : highest
    ).index;
  }

  setLeadingPlayer(index:number){
    this.leadingPlayerIndex = index
  }

  // Determine the actual player index who won the trick
  // This takes into account who led the trick
  determineTrickWinnerPlayerIndex(trick: Card[], trumpSuit: Suit | null): number {
    const trickWinnerPosition = this.determineTrickWinner(trick, trumpSuit);
    return (this.leadingPlayerIndex + trickWinnerPosition) % 4;
  }

  // Calculate points for a completed trick
  calculateTrickPoints(trick: Card[]): number {
    return trick.reduce((total, card) => total + card.points, 0);
  }

  // Validate marriage announcement
  canAnnounceMarriage(card: Card, playerHand: Card[], isFirstCardOfTrick: boolean): boolean {
    // Can only announce marriage when leading a trick
    if (!isFirstCardOfTrick) {
      return false;
    }

    // Card must be Queen (3) or King (4) 
    if (card.value !== 3 && card.value !== 4) {
      return false;
    }

    // Must have the partner card (Queen needs King, King needs Queen)
    const partnerValue = card.value === 3 ? 4 : 3;
    const hasPartner = playerHand.some(c => c.suit === card.suit && c.value === partnerValue);

    return hasPartner;
  }

  // Calculate marriage points
  calculateMarriagePoints(suit: Suit, trumpSuit: Suit | null): number {
    return suit === trumpSuit ? CRUCE_RULES.TRUMP_MARRIAGE_VALUE : CRUCE_RULES.REGULAR_MARRIAGE_VALUE;
  }

  // Convert hand points to game points
  convertToGamePoints(handPoints: number): number {
    return Math.floor(handPoints / CRUCE_RULES.POINTS_PER_GAME_POINT);
  }

  // Calculate final hand scoring
  calculateHandResult(
    playerScores: number[], 
    marriageScores: number[], 
    bid: number, 
    bidder: number
  ): { teamScores: number[]; gamePoints: number[]; bidMade: boolean } {
    
    // Add marriage points to player scores
    const totalPlayerScores = playerScores.map((score, index) => 
      score + (marriageScores[index] || 0)
    );

    // Calculate team scores (players 0,2 vs 1,3)
    const teamScores = [
      totalPlayerScores[0] + totalPlayerScores[2], // Team 1
      totalPlayerScores[1] + totalPlayerScores[3]  // Team 2
    ];

    // Determine which team the bidder is on
    const bidderTeam = bidder % 2;
    const bidderTeamScore = teamScores[bidderTeam];
    
    // Check if bid was made
    const bidInPoints = bid * CRUCE_RULES.POINTS_PER_GAME_POINT;
    const bidMade = bidderTeamScore >= bidInPoints;

    // Calculate game points
    let gamePoints = teamScores.map(score => this.convertToGamePoints(score));

    // Apply bid failure penalty
    if (!bidMade) {
      gamePoints[bidderTeam] = -bid;
    }

    return {
      teamScores,
      gamePoints,
      bidMade
    };
  }

  // Validate bid amount
  isValidBid(bid: number, currentBid: number): boolean {
    // Must bid higher than current bid, or bid 0 to pass
    if (bid === 0) return true; // Pass is always valid
    if (bid <= currentBid) return false; // Must bid higher
    if (bid > 6) return false; // Maximum reasonable bid
    return true;
  }

  // Check if bidding phase is complete
  isBiddingComplete(passedPlayers: number[], totalPlayers: number, highestBid: number): boolean {
    // Bidding is complete when 3 players have passed and someone has bid
    return passedPlayers.length === totalPlayers - 1 && highestBid > 0;
  }

  // Get all possible marriages in a hand
  findAllMarriages(hand: Card[]): { suit: Suit; cards: [Card, Card] }[] {
    const marriages: { suit: Suit; cards: [Card, Card] }[] = [];
    const suits = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
    
    suits.forEach(suit => {
      const queen = hand.find(card => card.suit === suit && card.value === 3);
      const king = hand.find(card => card.suit === suit && card.value === 4);
      
      if (queen && king) {
        marriages.push({
          suit,
          cards: [queen, king]
        });
      }
    });
    
    return marriages;
  }

  // Compare two cards to determine which wins in a trick context
  compareCardsForTrick(card1: Card, card2: Card, leadSuit: Suit, trumpSuit: Suit | null): number {
    // Trump cards always beat non-trump cards
    const card1IsTrump = trumpSuit && card1.suit === trumpSuit;
    const card2IsTrump = trumpSuit && card2.suit === trumpSuit;
    
    if (card1IsTrump && !card2IsTrump) return 1;  // card1 wins
    if (card2IsTrump && !card1IsTrump) return -1; // card2 wins
    
    // Both trump or both non-trump: compare by rank within suit
    if (card1IsTrump && card2IsTrump) {
      // Both trump cards - higher rank wins
      return this.getCardRank(card1) - this.getCardRank(card2);
    }
    
    // Neither is trump - only lead suit cards can win
    const card1FollowsLead = card1.suit === leadSuit;
    const card2FollowsLead = card2.suit === leadSuit;
    
    if (card1FollowsLead && !card2FollowsLead) return 1;  // card1 wins
    if (card2FollowsLead && !card1FollowsLead) return -1; // card2 wins
    
    // Both follow lead suit or both are off-suit
    if (card1FollowsLead && card2FollowsLead) {
      return this.getCardRank(card1) - this.getCardRank(card2);
    }
    
    // Both are off-suit and neither is trump - first card wins by default
    return 0;
  }

  // Get card hierarchy explanation for debugging
  getCardHierarchyExplanation(): string {
    return "Cruce card hierarchy (highest to lowest): As (11 pts) > 10 (10 pts) > King/4 (4 pts) > Queen/3 (3 pts) > 9 (0 pts) > 2 (2 pts)";
  }

  // Debug method to show trick evaluation step by step
  debugTrickEvaluation(trick: Card[], trumpSuit: Suit | null, leadingPlayer: number = 0): {
    winner: number;
    winnerPlayerIndex: number;
    explanation: string;
    cardRanks: { card: Card; rank: number; isTrump: boolean; followsLead: boolean; playerIndex: number }[];
  } {
    const leadSuit = trick[0].suit;
    const cardRanks = trick.map((card, index) => ({
      card,
      rank: this.getCardRank(card),
      isTrump: trumpSuit ? card.suit === trumpSuit : false,
      followsLead: card.suit === leadSuit,
      playerIndex: (leadingPlayer + index) % 4
    }));

    let explanation = `Lead suit: ${leadSuit}. Trump: ${trumpSuit || 'None'}. Leading player: ${leadingPlayer}\n`;
    
    cardRanks.forEach((item, index) => {
      explanation += `Player ${item.playerIndex}: ${item.card.displayValue} of ${item.card.suit} ` +
        `(rank: ${item.rank}, ${item.isTrump ? 'TRUMP' : 'not trump'}, ` +
        `${item.followsLead ? 'follows lead' : 'off suit'})\n`;
    });

    const trickWinnerPosition = this.determineTrickWinner(trick, trumpSuit);
    const winnerPlayerIndex = this.determineTrickWinnerPlayerIndex(trick, trumpSuit);
    
    explanation += `Winner position in trick: ${trickWinnerPosition}, Actual player: ${winnerPlayerIndex} ` +
      `with ${trick[trickWinnerPosition].displayValue} of ${trick[trickWinnerPosition].suit}`;

    return {
      winner: trickWinnerPosition,
      winnerPlayerIndex,
      explanation,
      cardRanks
    };
  }

  // Validate complete game state
  validateGameState(gameState: GameState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check player count
    if (gameState.players.length !== 4) {
      errors.push(`Game must have exactly 4 players, has ${gameState.players.length}`);
    }

    // Check hand sizes
    const expectedHandSize = gameState.phase === 'playing' ? 
      6 - Math.floor(gameState.currentTrick.length / 4) : 6;
    
    gameState.players.forEach((player, index) => {
      if (player.hand.length > 6) {
        errors.push(`Player ${index} has too many cards: ${player.hand.length}`);
      }
    });

    // Check current player index
    if (gameState.currentPlayer < 0 || gameState.currentPlayer >= gameState.players.length) {
      errors.push(`Invalid current player index: ${gameState.currentPlayer}`);
    }

    // Check trick size
    if (gameState.currentTrick.length > 4) {
      errors.push(`Trick cannot have more than 4 cards, has ${gameState.currentTrick.length}`);
    }

    // Validate bid
    if (gameState.bid < 0 || gameState.bid > 6) {
      errors.push(`Invalid bid amount: ${gameState.bid}`);
    }

    // Check bidder index
    if (gameState.bidder !== -1 && 
        (gameState.bidder < 0 || gameState.bidder >= gameState.players.length)) {
      errors.push(`Invalid bidder index: ${gameState.bidder}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get detailed rule explanation for a specific situation
  getPlayRuleExplanation(card: Card, gameState: GameState): string {
    const { currentTrick, trumpSuit, currentPlayer, players } = gameState;
    const playerHand = players[currentPlayer].hand;

    if (currentTrick.length === 0) {
      return "You are leading this trick and can play any card.";
    }

    const leadSuit = currentTrick[0].suit;
    const hasSuit = playerHand.some(c => c.suit === leadSuit);
    const hasTrump = trumpSuit ? playerHand.some(c => c.suit === trumpSuit) : false;

    if (hasSuit) {
      if (card.suit === leadSuit) {
        return `You must follow suit (${leadSuit}) and this card is valid.`;
      } else {
        return `You must follow suit (${leadSuit}). This card is not playable.`;
      }
    }

    if (trumpSuit && leadSuit !== trumpSuit && hasTrump) {
      if (card.suit === trumpSuit) {
        return `You cannot follow suit, so you must play trump. This trump card is valid.`;
      } else {
        return `You cannot follow suit and must play trump. This card is not playable.`;
      }
    }

    return "You cannot follow suit and have no trump, so you can play any card.";
  }

  // Get bidding advice based on hand strength
  getBiddingAdvice(hand: Card[]): { recommendedBid: number; reasoning: string } {
    const totalPoints = hand.reduce((sum, card) => sum + card.points, 0);
    const marriages = this.findAllMarriages(hand);
    const marriagePoints = marriages.length * 20; // Assume non-trump for safety
    const highCards = hand.filter(card => card.value >= 10).length;
    
    // Calculate potential points
    const potentialPoints = totalPoints + marriagePoints;
    
    let recommendedBid = 0;
    let reasoning = "";

    if (potentialPoints >= 99) { // 3+ game points
      recommendedBid = 3;
      reasoning = `Strong hand with ${totalPoints} card points, ${marriages.length} marriages, and ${highCards} high cards.`;
    } else if (potentialPoints >= 66) { // 2+ game points
      recommendedBid = 2;
      reasoning = `Good hand with ${totalPoints} card points and ${marriages.length} marriages.`;
    } else if (potentialPoints >= 33) { // 1+ game point
      recommendedBid = 1;
      reasoning = `Decent hand with ${totalPoints} card points, worth a conservative bid.`;
    } else {
      recommendedBid = 0;
      reasoning = `Weak hand with only ${totalPoints} card points. Better to pass.`;
    }

    // Adjust for marriages
    if (marriages.length >= 2) {
      recommendedBid = Math.min(recommendedBid + 1, 4);
      reasoning += ` Multiple marriages increase bid potential.`;
    }

    return { recommendedBid, reasoning };
  }

  // Check for common rule violations
  detectRuleViolations(gameState: GameState, playedCard?: Card): string[] {
    const violations: string[] = [];
    
    if (playedCard && !this.isCardPlayable(playedCard, gameState)) {
      violations.push("Card played violates suit-following rules");
    }

    // Check for impossible card combinations
    const allCards = gameState.players.flatMap(p => p.hand).concat(gameState.currentTrick);
    const cardCounts = new Map<string, number>();
    
    allCards.forEach(card => {
      const key = `${card.suit}-${card.value}`;
      cardCounts.set(key, (cardCounts.get(key) || 0) + 1);
      
      if (cardCounts.get(key)! > 1) {
        violations.push(`Duplicate card detected: ${card.displayValue} of ${card.suit}`);
      }
    });

    return violations;
  }

  // Calculate optimal trump suit based on hand
  suggestTrumpSuit(hand: Card[]): { suit: Suit; score: number; reasoning: string } {
    const suits = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
    const suitAnalysis = suits.map(suit => {
      const suitCards = hand.filter(card => card.suit === suit);
      const suitPoints = suitCards.reduce((sum, card) => sum + card.points, 0);
      const hasMarriage = this.findAllMarriages(hand).some(m => m.suit === suit);
      const highCards = suitCards.filter(card => card.value >= 10).length;
      
      let score = suitCards.length * 10; // Length bonus
      score += suitPoints; // Point bonus
      score += hasMarriage ? 40 : 0; // Marriage bonus (trump value)
      score += highCards * 5; // High card bonus
      
      return {
        suit,
        score,
        reasoning: `${suitCards.length} cards, ${suitPoints} points, ${hasMarriage ? 'has' : 'no'} marriage, ${highCards} high cards`
      };
    });

    const best = suitAnalysis.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return best;
  }

  // Game flow helpers
  getNextPhase(currentPhase: string, gameState: GameState): string {
    switch (currentPhase) {
      case 'bidding':
        return this.isBiddingComplete(gameState.passedPlayers, 4, gameState.bid) ? 'playing' : 'bidding';
      case 'playing':
        // Check if all hands are empty (game finished)
        const allHandsEmpty = gameState.players.every(player => player.hand.length === 0);
        return allHandsEmpty ? 'finished' : 'playing';
      case 'finished':
        return 'finished';
      default:
        return 'bidding';
    }
  }

  // Scoring helpers
  formatScore(score: number): string {
    if (score < 0) {
      return `${score}`;
    }
    return `+${score}`;
  }

  // Get human-readable game summary
  getGameSummary(gameState: GameState): string {
    const { players, bid, bidder, trumpSuit, gameScore, targetScore } = gameState;
    
    let summary = `Game to ${targetScore} points. Current score: Your team ${gameScore[0]}, Opponents ${gameScore[1]}.\n`;
    
    if (bid > 0 && bidder >= 0) {
      summary += `${players[bidder].name} bid ${bid}`;
      if (trumpSuit) {
        summary += ` with ${trumpSuit} as trump`;
      }
      summary += '.\n';
    }

    const tricksPlayed = 6 - (players[0].hand.length);
    summary += `${tricksPlayed} of 6 tricks played.`;

    return summary;
  }
}