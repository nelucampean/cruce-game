export enum Suit {
  SPADES = 'spades',
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs'
}

export interface Card {
  suit: Suit;
  value: number; // 7, 8, 9, 10, J=11, Q=12, K=13, A=14
  displayValue: string;
  points: number; // Cruce point values
  id: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  isHuman: boolean;
}

export enum GamePhase {
  BIDDING = 'bidding',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

export interface GameState {
  players: Player[];
  currentPlayer: number;
  phase: GamePhase;
  trumpSuit: Suit | null;
  currentTrick: Card[];
  bid: number;
  bidder: number;
  scores: number[];
}