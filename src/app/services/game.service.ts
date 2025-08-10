// src/app/services/game.service.ts (Updated for standalone - injectable root)
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card, GamePhase, GameState, Player, Suit } from '../models/card.model';
import { DeckService } from './deck.service';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private gameState = new BehaviorSubject<GameState>({
    players: [],
    currentPlayer: 0,
    phase: GamePhase.BIDDING,
    trumpSuit: null,
    currentTrick: [],
    bid: 0,
    bidder: -1,
    scores: [0, 0, 0, 0]
  });

  gameState$ = this.gameState.asObservable();

  constructor(private deckService: DeckService) {}

  startNewGame() {
    const deck = this.deckService.createDeck();
    const players: Player[] = [
      { id: '1', name: 'Player', hand: [], score: 0, isHuman: true },
      { id: '2', name: 'Bot 1', hand: [], score: 0, isHuman: false },
      { id: '3', name: 'Bot 2', hand: [], score: 0, isHuman: false },
      { id: '4', name: 'Bot 3', hand: [], score: 0, isHuman: false }
    ];

    this.deckService.dealCards(deck, players, 8);

    this.gameState.next({
      ...this.gameState.value,
      players,
      phase: GamePhase.BIDDING,
      currentPlayer: 0
    });
  }

  makeBid(bid: number) {
    const state = this.gameState.value;
    
    if (bid > state.bid) {
      this.gameState.next({
        ...state,
        bid,
        bidder: state.currentPlayer
      });
    }

    const nextPlayer = (state.currentPlayer + 1) % 4;
    
    if (bid > 0) {
      this.gameState.next({
        ...this.gameState.value,
        phase: GamePhase.PLAYING,
        currentPlayer: state.bidder,
        trumpSuit: Suit.SPADES
      });
    } else {
      this.gameState.next({
        ...this.gameState.value,
        currentPlayer: nextPlayer
      });
    }
  }

  playCard(card: Card) {
    const state = this.gameState.value;
    
    if (!this.isCardPlayable(card)) return;

    const updatedPlayers = [...state.players];
    const currentPlayerHand = updatedPlayers[state.currentPlayer].hand;
    const cardIndex = currentPlayerHand.findIndex(c => c.id === card.id);
    if (cardIndex > -1) {
      currentPlayerHand.splice(cardIndex, 1);
    }

    const updatedTrick = [...state.currentTrick, card];

    this.gameState.next({
      ...state,
      players: updatedPlayers,
      currentTrick: updatedTrick,
      currentPlayer: (state.currentPlayer + 1) % 4
    });

    if (updatedTrick.length === 4) {
      this.evaluateTrick();
    }
  }

  isCardPlayable(card: Card): boolean {
    const state = this.gameState.value;
    
    if (state.phase !== GamePhase.PLAYING) return false;
    if (state.currentTrick.length === 0) return true;
    
    const leadSuit = state.currentTrick[0].suit;
    const playerHand = state.players[state.currentPlayer].hand;
    const hasSuit = playerHand.some(c => c.suit === leadSuit);
    
    return !hasSuit || card.suit === leadSuit;
  }

  private evaluateTrick() {
    const state = this.gameState.value;
    const trickWinner = this.determineTrickWinner(state.currentTrick, state.trumpSuit);
    
    const points = state.currentTrick.reduce((sum, card) => sum + card.points, 0);
    const updatedScores = [...state.scores];
    updatedScores[trickWinner] += points;

    this.gameState.next({
      ...state,
      currentTrick: [],
      scores: updatedScores,
      currentPlayer: trickWinner
    });
  }

  private determineTrickWinner(trick: Card[], trumpSuit: Suit | null): number {
    const leadSuit = trick[0].suit;
    
    const trumpCards = trick
      .map((card, index) => ({ card, index }))
      .filter(item => item.card.suit === trumpSuit);
    
    if (trumpCards.length > 0) {
      return trumpCards.reduce((highest, current) => 
        current.card.value > highest.card.value ? current : highest
      ).index;
    }

    const leadSuitCards = trick
      .map((card, index) => ({ card, index }))
      .filter(item => item.card.suit === leadSuit);

    return leadSuitCards.reduce((highest, current) => 
      current.card.value > highest.card.value ? current : highest
    ).index;
  }
}