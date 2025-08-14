import { Injectable } from '@angular/core';
import { Card, Suit, Player } from '../models/card.model';

interface BotPlay {
  card: Card;
  announceMarriage?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {

  constructor() { }

  // Bot bidding logic based on hand strength
  getBotBid(hand: Card[], currentBid: number, playerIndex: number): number {
    const handStrength = this.evaluateHandStrength(hand);
    
    // Base bidding thresholds (adjusted by difficulty)
    const difficultyMultiplier = this.getBotDifficulty(playerIndex);
    
    let bidThreshold = 0;
    
    // Calculate bid based on hand strength
    if (handStrength >= 80 * difficultyMultiplier) {
      bidThreshold = 4;
    } else if (handStrength >= 65 * difficultyMultiplier) {
      bidThreshold = 3;
    } else if (handStrength >= 50 * difficultyMultiplier) {
      bidThreshold = 2;
    } else if (handStrength >= 35 * difficultyMultiplier) {
      bidThreshold = 1;
    }

    // Add some randomness to make bots less predictable
    const randomFactor = Math.random();
    if (randomFactor > 0.8 && bidThreshold > 0) {
      bidThreshold += 1; // Aggressive bid
    } else if (randomFactor < 0.2 && bidThreshold > 1) {
      bidThreshold -= 1; // Conservative bid
    }

    // Ensure we bid higher than current bid, or pass
    if (bidThreshold > currentBid) {
      console.log(`Bot ${playerIndex} evaluates hand strength: ${handStrength.toFixed(1)}, bids: ${bidThreshold}`);
      return bidThreshold;
    } else {
      console.log(`Bot ${playerIndex} evaluates hand strength: ${handStrength.toFixed(1)}, passes (current bid: ${currentBid})`);
      return 0; // Pass
    }
  }

  // Bot playing logic
  getBotPlay(
    hand: Card[], 
    currentTrick: Card[], 
    trumpSuit: Suit | null,
    playerIndex: number,
    allPlayers: Player[],
    marriageAnnouncements: any[]
  ): BotPlay {
    
    const playableCards = this.getPlayableCards(hand, currentTrick, trumpSuit);
    
    if (playableCards.length === 0) {
      console.warn('No playable cards found, playing first card');
      return { card: hand[0] };
    }

    let selectedCard: Card;
    let announceMarriage = false;

    if (currentTrick.length === 0) {
      // Leading the trick
      const marriagePlay = this.considerMarriagePlay(hand, trumpSuit);
      if (marriagePlay) {
        selectedCard = marriagePlay.card;
        announceMarriage = marriagePlay.announce;
      } else {
        selectedCard = this.selectLeadCard(playableCards, trumpSuit, playerIndex);
      }
    } else {
      // Following in the trick
      selectedCard = this.selectFollowCard(
        playableCards, 
        currentTrick, 
        trumpSuit, 
        playerIndex,
        allPlayers
      );
    }
    selectedCard.playerID = playerIndex
    console.log(`Bot ${playerIndex} plays: ${selectedCard.displayValue} of ${selectedCard.suit}${announceMarriage ? ' (announces marriage)' : ''}`);
    
    return { card: selectedCard, announceMarriage };
  }

  private evaluateHandStrength(hand: Card[]): number {
    let strength = 0;
    
    // Count points in hand
    const totalPoints = hand.reduce((sum, card) => sum + card.points, 0);
    strength += totalPoints * 1.5; // Point value multiplier
    
    // Count marriages (King-Queen pairs)
    const marriages = this.countMarriages(hand);
    strength += marriages * 25; // Marriage bonus
    
    // Count high cards (Aces and 10s)
    const highCards = hand.filter(card => card.value === 11 || card.value === 10).length;
    strength += highCards * 8;
    
    // Suit distribution bonus (prefer having cards in multiple suits)
    const suitCounts = this.getSuitDistribution(hand);
    const nonEmptySuits = suitCounts.filter(count => count > 0).length;
    strength += nonEmptySuits * 5;
    
    // Long suit bonus (good for trump)
    const maxSuitLength = Math.max(...suitCounts);
    if (maxSuitLength >= 3) {
      strength += (maxSuitLength - 2) * 10;
    }

    return strength;
  }

  private getBotDifficulty(playerIndex: number): number {
    // Different difficulty levels for variety
    const difficulties = [0.3, 0.5, 0.4, 0.6]; // Normal, Easy, Hard, Medium
    return difficulties[playerIndex] || 1.0;
  }

  private getPlayableCards(hand: Card[], currentTrick: Card[], trumpSuit: Suit | null): Card[] {
    if (currentTrick.length === 0) {
      return hand; // Can play any card when leading
    }

    const leadSuit = currentTrick[0].suit;
    
    // Must follow suit if possible
    const suitCards = hand.filter(card => card.suit === leadSuit);
    if (suitCards.length > 0) {
      return suitCards;
    }

    // Must play trump if can't follow suit and has trump
    if (trumpSuit && leadSuit !== trumpSuit) {
      const trumpCards = hand.filter(card => card.suit === trumpSuit);
      if (trumpCards.length > 0) {
        return trumpCards;
      }
    }

    // Can play any card if can't follow suit and no trump
    return hand;
  }

  private considerMarriagePlay(hand: Card[], trumpSuit: Suit | null): { card: Card; announce: boolean } | null {
    const marriages = this.getAvailableMarriages(hand, trumpSuit);
    
    if (marriages.length === 0) return null;

    // Prefer trump marriages, then highest value marriages
    const bestMarriage = marriages.reduce((best, current) => 
      current.value > best.value ? current : best
    );

    // Play the King or Queen from the marriage
    const marriageCards = hand.filter(card => 
      card.suit === bestMarriage.suit && (card.value === 3 || card.value === 4)
    );

    if (marriageCards.length > 0) {
      // Prefer to play King (4) over Queen (3) when leading
      const cardToPlay = marriageCards.find(c => c.value === 4) || marriageCards[0];
      return { card: cardToPlay, announce: true };
    }

    return null;
  }

  private selectLeadCard(playableCards: Card[], trumpSuit: Suit | null, playerIndex: number): Card {
    const difficulty = this.getBotDifficulty(playerIndex);
    
    // Advanced bots prefer to lead with high cards or trump
    if (difficulty > 1.0) {
      // Hard bot - strategic play
      const trumpCards = trumpSuit ? playableCards.filter(c => c.suit === trumpSuit) : [];
      const aces = playableCards.filter(c => c.value === 11);
      const tens = playableCards.filter(c => c.value === 10);
      
      if (trumpCards.length > 0 && Math.random() > 0.3) {
        return this.selectHighestCard(trumpCards);
      } else if (aces.length > 0 && Math.random() > 0.4) {
        return aces[Math.floor(Math.random() * aces.length)];
      } else if (tens.length > 0 && Math.random() > 0.5) {
        return tens[Math.floor(Math.random() * tens.length)];
      }
    }

    // Default: prefer high-value cards but with some randomness
    const sortedCards = [...playableCards].sort((a, b) => b.points - a.points);
    const topCards = sortedCards.slice(0, Math.min(3, sortedCards.length));
    
    return topCards[Math.floor(Math.random() * topCards.length)];
  }

  private selectFollowCard(
    playableCards: Card[], 
    currentTrick: Card[], 
    trumpSuit: Suit | null,
    playerIndex: number,
    allPlayers: Player[]
  ): Card {
    const leadSuit = currentTrick[0].suit;
    const difficulty = this.getBotDifficulty(playerIndex);
    
    // Determine if we're likely to win this trick
    const highestCardSoFar = this.getHighestCardInTrick(currentTrick, trumpSuit);
    const canWin = playableCards.some(card => this.isCardHigher(card, highestCardSoFar, trumpSuit, leadSuit));
    
    if (canWin && difficulty > 0.8) {
      // Try to win with the lowest card that can win
      const winningCards = playableCards.filter(card => 
        this.isCardHigher(card, highestCardSoFar, trumpSuit, leadSuit)
      );
      return this.selectLowestCard(winningCards);
    } else {
      // Can't win or don't want to - play lowest card to save good cards
      const lowCards = playableCards.filter(card => card.points === 0);
      if (lowCards.length > 0) {
        return lowCards[Math.floor(Math.random() * lowCards.length)];
      } else {
        return this.selectLowestCard(playableCards);
      }
    }
  }

  private getHighestCardInTrick(trick: Card[], trumpSuit: Suit | null): Card {
    const leadSuit = trick[0].suit;
    
    // Check for trump cards first
    if (trumpSuit) {
      const trumpCards = trick.filter(card => card.suit === trumpSuit);
      if (trumpCards.length > 0) {
        return trumpCards.reduce((highest, card) => 
          card.value > highest.value ? card : highest
        );
      }
    }
    
    // Get highest card of lead suit
    const leadSuitCards = trick.filter(card => card.suit === leadSuit);
    return leadSuitCards.reduce((highest, card) => 
      card.value > highest.value ? card : highest
    );
  }

  private isCardHigher(card: Card, compareCard: Card, trumpSuit: Suit | null, leadSuit: Suit): boolean {
    // Trump always beats non-trump
    if (trumpSuit) {
      if (card.suit === trumpSuit && compareCard.suit !== trumpSuit) {
        return true;
      }
      if (card.suit !== trumpSuit && compareCard.suit === trumpSuit) {
        return false;
      }
      if (card.suit === trumpSuit && compareCard.suit === trumpSuit) {
        return card.value > compareCard.value;
      }
    }
    
    // Both non-trump cards - only same suit matters
    if (card.suit === leadSuit && compareCard.suit === leadSuit) {
      return card.value > compareCard.value;
    }
    
    // Different suits, compare card follows lead suit rules
    if (card.suit === leadSuit) {
      return true;
    }
    
    return false;
  }

  private selectHighestCard(cards: Card[]): Card {
    return cards.reduce((highest, card) => 
      card.value > highest.value ? card : highest
    );
  }

  private selectLowestCard(cards: Card[]): Card {
    return cards.reduce((lowest, card) => 
      card.value < lowest.value ? card : lowest
    );
  }

  private countMarriages(hand: Card[]): number {
    const suits = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
    let marriages = 0;
    
    suits.forEach(suit => {
      const hasQueen = hand.some(card => card.suit === suit && card.value === 3);
      const hasKing = hand.some(card => card.suit === suit && card.value === 4);
      if (hasQueen && hasKing) {
        marriages++;
      }
    });
    
    return marriages;
  }

  private getSuitDistribution(hand: Card[]): number[] {
    const distribution = [0, 0, 0, 0]; // [ROSU, GHINDA, VERDE, DUBA]
    const suitOrder = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
    
    hand.forEach(card => {
      const suitIndex = suitOrder.indexOf(card.suit);
      if (suitIndex >= 0) {
        distribution[suitIndex]++;
      }
    });
    
    return distribution;
  }

  private getAvailableMarriages(hand: Card[], trumpSuit: Suit | null): { suit: Suit; value: number }[] {
    const suits = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
    const marriages: { suit: Suit; value: number }[] = [];
    
    suits.forEach(suit => {
      const hasQueen = hand.some(card => card.suit === suit && card.value === 3);
      const hasKing = hand.some(card => card.suit === suit && card.value === 4);
      
      if (hasQueen && hasKing) {
        const value = suit === trumpSuit ? 40 : 20;
        marriages.push({ suit, value });
      }
    });
    
    return marriages;
  }

  // Helper method for human players to get play suggestions
  getPlaySuggestion(
    hand: Card[], 
    currentTrick: Card[], 
    trumpSuit: Suit | null,
    allPlayers: Player[]
  ): { card: Card; reason: string } {
    const playableCards = this.getPlayableCards(hand, currentTrick, trumpSuit);
    
    if (playableCards.length === 0) {
      return { card: hand[0], reason: 'No playable cards available' };
    }

    if (currentTrick.length === 0) {
      // Leading the trick
      const marriagePlay = this.considerMarriagePlay(hand, trumpSuit);
      if (marriagePlay) {
        return { 
          card: marriagePlay.card, 
          reason: `Play marriage in ${marriagePlay.card.suit} for ${trumpSuit === marriagePlay.card.suit ? '40' : '20'} points`
        };
      }

      const highCards = playableCards.filter(card => card.points > 0);
      if (highCards.length > 0) {
        const bestCard = this.selectHighestCard(highCards);
        return { card: bestCard, reason: `Lead with high-value card (${bestCard.points} points)` };
      }

      return { card: playableCards[0], reason: 'Lead with any card' };
    } else {
      // Following in the trick
      const highestCardSoFar = this.getHighestCardInTrick(currentTrick, trumpSuit);
      const canWin = playableCards.some(card => 
        this.isCardHigher(card, highestCardSoFar, trumpSuit, currentTrick[0].suit)
      );

      if (canWin) {
        const winningCards = playableCards.filter(card => 
          this.isCardHigher(card, highestCardSoFar, trumpSuit, currentTrick[0].suit)
        );
        const bestCard = this.selectLowestCard(winningCards);
        return { card: bestCard, reason: 'Win trick with lowest winning card' };
      } else {
        const lowCards = playableCards.filter(card => card.points === 0);
        if (lowCards.length > 0) {
          return { card: lowCards[0], reason: 'Cannot win, play low card to save points' };
        }
        const lowestCard = this.selectLowestCard(playableCards);
        return { card: lowestCard, reason: 'Cannot win, play lowest available card' };
      }
    }
  }

  // Evaluate if a bid is reasonable for a given hand
  evaluateBidReasonableness(hand: Card[], bid: number): { reasonable: boolean; reason: string } {
    const handStrength = this.evaluateHandStrength(hand);
    const requiredStrength = bid * 30; // Rough threshold per bid level
    
    if (handStrength >= requiredStrength) {
      return { 
        reasonable: true, 
        reason: `Hand strength (${handStrength.toFixed(1)}) supports bid of ${bid}` 
      };
    } else {
      return { 
        reasonable: false, 
        reason: `Hand strength (${handStrength.toFixed(1)}) too low for bid of ${bid} (need ~${requiredStrength})` 
      };
    }
  }

  // Get detailed hand analysis for UI display
  getHandAnalysis(hand: Card[], trumpSuit?: Suit | null): any {
    const totalPoints = hand.reduce((sum, card) => sum + card.points, 0);
    const marriages = this.getAvailableMarriages(hand, trumpSuit || null);
    const suitDistribution = this.getSuitDistribution(hand);
    const handStrength = this.evaluateHandStrength(hand);
    
    const highCards = hand.filter(card => card.value === 11 || card.value === 10);
    const trumpCards = trumpSuit ? hand.filter(card => card.suit === trumpSuit) : [];
    
    return {
      totalPoints,
      marriages: marriages.length,
      marriageDetails: marriages,
      handStrength: Math.round(handStrength),
      highCards: highCards.length,
      trumpCards: trumpCards.length,
      suitDistribution: {
        [Suit.ROSU]: suitDistribution[0],
        [Suit.GHINDA]: suitDistribution[1],
        [Suit.VERDE]: suitDistribution[2],
        [Suit.DUBA]: suitDistribution[3]
      },
      recommendedBid: this.getRecommendedBid(handStrength)
    };
  }

  private getRecommendedBid(handStrength: number): number {
    if (handStrength >= 80) return 4;
    if (handStrength >= 65) return 3;
    if (handStrength >= 50) return 2;
    if (handStrength >= 35) return 1;
    return 0; // Pass
  }
}