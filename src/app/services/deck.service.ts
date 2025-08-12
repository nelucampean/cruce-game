import { Injectable } from '@angular/core';
import { Card, Suit, Player } from '../models/card.model';

@Injectable({
  providedIn: 'root'
})
export class DeckService {

  createDeck(): Card[] {
    const deck: Card[] = [];
    const suits = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
    
    // Cruce uses only 6 cards per suit according to Romanian rules:
    // Doiar (2), Treiar (3/Queen), Pătrar (4/King), Nouăr (9), Zecar (10), As (Ace)
    const cardData = [
      { value: 2, display: 'Doiar', points: 2, imageValue: '2' },      // 2 with 2 points
      { value: 3, display: 'Treiar', points: 3, imageValue: '3' },     // Queen with 3 points  
      { value: 4, display: 'Pătrar', points: 4, imageValue: '4' },     // King with 4 points
      { value: 9, display: 'Nouar', points: 0, imageValue: '9' },      // 9 with 0 points
      { value: 10, display: 'Zecar', points: 10, imageValue: '10' },   // 10 with 10 points
      { value: 11, display: 'As', points: 11, imageValue: 'as' }       // Ace with 11 points
    ];

    suits.forEach(suit => {
      cardData.forEach(cardInfo => {
        deck.push({
          suit,
          value: cardInfo.value,
          displayValue: cardInfo.display,
          points: cardInfo.points,
          id: `${suit}-${cardInfo.value}`,
          imageUrl: this.getCardImageUrl(cardInfo.imageValue, suit)
        });
      });
    });

    return this.shuffleDeck(deck);
  }

    private getCardImageUrl(cardValue: string, suit: Suit): string {
    // Map suits to file suffixes based on your file pattern
    const suitMap: { [key in Suit]: string } = {
      [Suit.ROSU]: 'r',    // Roșu -> r (red diamonds)
      [Suit.GHINDA]: 'g',  // Ghindă -> g (black spades)  
      [Suit.VERDE]: 'v',   // Verde -> v (green clubs)
      [Suit.DUBA]: 'd'     // Dubă -> d (red hearts)
    };
    
    const suitSuffix = suitMap[suit];
    return `images/cards/carte_${cardValue}_${suitSuffix}.png`;
  }
  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  dealCards(deck: Card[], players: Player[], cardsPerPlayer: number) {
    let cardIndex = 0;
    
    // Deal cards round-robin style, starting from first player
    for (let i = 0; i < cardsPerPlayer; i++) {
      for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
        if (cardIndex < deck.length) {
          players[playerIndex].hand.push(deck[cardIndex]);
          cardIndex++;
        }
      }
    }

    // Sort each player's hand by suit then value for better organization
    players.forEach(player => {
      player.hand.sort((a, b) => {
        if (a.suit !== b.suit) {
          // Sort by suit order: ROSU, GHINDA, VERDE, DUBA
          const suitOrder = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
          return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
        }
        return a.value - b.value;
      });
    });
  }

  getCardBackUrl(): string {
    return 'images/cards/carte_spate.png';
  }

  // Helper method to get total deck information
  getDeckInfo() {
    return {
      totalCards: 24,      // 6 cards × 4 suits
      cardsPerPlayer: 6,   // For 4 players in classic Cruce
      pointsInDeck: 120,   // Total points: (2+3+4+0+10+11) × 4 suits = 30 × 4 = 120
      marriagePoints: 100, // Maximum marriage points: 3×20 + 1×40 = 100
      maxGamePoints: 220   // Maximum possible points in a hand including marriages
    };
  }

  // Get card value in Romanian terminology
  getCardDisplayName(card: Card): string {
    const romanianNames: { [key: number]: string } = {
      2: 'Doiar',
      3: 'Treiar', // Queen equivalent
      4: 'Pătrar', // King equivalent (also called "Cal")
      9: 'Nouar',
      10: 'Zecar',
      11: 'As'
    };
    
    return romanianNames[card.value] || card.displayValue;
  }

  // Get suit display name in Romanian
  getSuitDisplayName(suit: Suit): string {
    const suitNames: { [key in Suit]: string } = {
      [Suit.ROSU]: 'Roșu',
      [Suit.GHINDA]: 'Ghindă', 
      [Suit.VERDE]: 'Verde',
      [Suit.DUBA]: 'Dubă'
    };
    
    return suitNames[suit];
  }

  // Helper to validate a deck is complete and correct for Cruce
  validateDeck(deck: Card[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (deck.length !== 24) {
      errors.push(`Deck should have 24 cards, has ${deck.length}`);
    }

    const suits = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
    const expectedValues = [2, 3, 4, 9, 10, 11];
    
    suits.forEach(suit => {
      const suitCards = deck.filter(card => card.suit === suit);
      if (suitCards.length !== 6) {
        errors.push(`Suit ${suit} should have 6 cards, has ${suitCards.length}`);
      }
      
      expectedValues.forEach(value => {
        const cardExists = suitCards.some(card => card.value === value);
        if (!cardExists) {
          errors.push(`Missing card: ${value} of ${suit}`);
        }
      });
    });

    // Validate point totals
    const totalPoints = deck.reduce((sum, card) => sum + card.points, 0);
    if (totalPoints !== 120) {
      errors.push(`Total points should be 120, calculated ${totalPoints}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Helper method to create a test deck with known cards (for testing)
  createTestDeck(playerHands?: Card[][]): Card[] {
    if (playerHands) {
      // Create deck from provided hands
      const deck: Card[] = [];
      playerHands.forEach(hand => {
        deck.push(...hand);
      });
      return deck;
    }
    
    // Create a normal shuffled deck
    return this.createDeck();
  }

  // Get card sorting order for display purposes
  getCardSortValue(card: Card): number {
    const suitOrder = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
    const suitValue = suitOrder.indexOf(card.suit) * 100;
    return suitValue + card.value;
  }

  // Helper to find cards that form marriages in a hand
  findMarriages(hand: Card[]): { suit: Suit; cards: Card[] }[] {
    const marriages: { suit: Suit; cards: Card[] }[] = [];
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

  // Calculate marriage points for a given suit and trump
  getMarriagePoints(suit: Suit, trumpSuit: Suit | null): number {
    return trumpSuit === suit ? 40 : 20;
  }

  // Check if two cards form a valid marriage
  isValidMarriage(card1: Card, card2: Card): boolean {
    return card1.suit === card2.suit && 
           ((card1.value === 3 && card2.value === 4) || 
            (card1.value === 4 && card2.value === 3));
  }
}