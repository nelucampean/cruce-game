import { Injectable } from '@angular/core';
import { Card, Suit, Player } from '../models/card.model';

@Injectable({
  providedIn: 'root'
})
export class DeckService {

  createDeck(): Card[] {
    const deck: Card[] = [];
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
    const values = [7, 8, 9, 10, 11, 12, 13, 14]; // J=11, Q=12, K=13, A=14
    const displayValues = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const points = [0, 0, 0, 10, 2, 3, 4, 11]; // Cruce point values

    suits.forEach(suit => {
      values.forEach((value, index) => {
        deck.push({
          suit,
          value,
          displayValue: displayValues[index],
          points: points[index],
          id: `${suit}-${value}`
        });
      });
    });

    return this.shuffleDeck(deck);
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
    
    for (let i = 0; i < cardsPerPlayer; i++) {
      for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
        if (cardIndex < deck.length) {
          players[playerIndex].hand.push(deck[cardIndex]);
          cardIndex++;
        }
      }
    }

    // Sort each player's hand
    players.forEach(player => {
      player.hand.sort((a, b) => {
        if (a.suit !== b.suit) {
          return a.suit.localeCompare(b.suit);
        }
        return a.value - b.value;
      });
    });
  }
}
