export enum Suit {
  ROSU = 'rosu',
  GHINDA = 'ghinda', 
  VERDE = 'verde',
  DUBA = 'duba'
}

export interface Card {
  id: string;
  suit: Suit;
  value: number;        // 2, 3, 4, 9, 10, 11
  displayValue: string; // Romanian names: Doiar, Treiar, Pătrar, Nouăr, Zecar, As
  points: number;       // Points for scoring: 2, 3, 4, 0, 10, 11
  imageUrl: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  isHuman: boolean;
  marriageAnnouncements?: { suit: Suit; value: number }[]; // Track announced marriages
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
  bidder: number;        // Index of player who won the bid
  scores: number[];      // Points scored this hand by each player
  gameScore: number[];   // Overall game score by team [team1, team2]
  targetScore: number;   // Points needed to win the game (usually 15)
  passedPlayers: number[]; // Players who passed in current bidding round
  trickHistory?: Card[][]; // History of all completed tricks
  currentDealer?: number;  // Index of current dealer
}

// Additional interfaces for game management

export interface TrickResult {
  winner: number;
  cards: Card[];
  points: number;
}

export interface HandResult {
  playerScores: number[];
  teamScores: number[];
  bidMade: boolean;
  bidder: number;
  bid: number;
  marriages: { player: number; suit: Suit; value: number }[];
}

export interface GameStats {
  cardsPerPlayer: number;
  tricksPlayed: number;
  tricksRemaining: number;
  totalPoints: number;
  gameScore: number[];
  targetScore: number;
  currentBid: number;
  bidder: number;
  trumpSuit: Suit | null;
  currentHandPoints: number[];
}

export interface BotDifficulty {
  level: 'easy' | 'medium' | 'hard';
  biddingAggression: number;   // 0.5 to 1.5
  playingSkill: number;        // 0.5 to 1.5
  memoryAccuracy: number;      // 0.5 to 1.0 (remembers played cards)
}

export interface PlayableCardInfo {
  card: Card;
  isPlayable: boolean;
  reason?: string;
  suggestion?: 'good' | 'bad' | 'neutral';
}

export interface MarriageInfo {
  suit: Suit;
  value: number;
  cards: Card[];
  canAnnounce: boolean;
}

// Game rule constants
export const CRUCE_RULES = {
  CARDS_PER_SUIT: 6,
  TOTAL_CARDS: 24,
  PLAYERS: 4,
  CARDS_PER_PLAYER: 6,
  TOTAL_POINTS: 120,
  MAX_MARRIAGE_POINTS: 100,
  MAX_HAND_POINTS: 220,
  POINTS_PER_GAME_POINT: 33,
  TRUMP_MARRIAGE_VALUE: 40,
  REGULAR_MARRIAGE_VALUE: 20,
  CARD_VALUES: {
    2: { points: 2, display: 'Doiar' },
    3: { points: 3, display: 'Treiar' },   // Queen equivalent
    4: { points: 4, display: 'Pătrar' },   // King equivalent
    9: { points: 0, display: 'Nouăr' },
    10: { points: 10, display: 'Zecar' },
    11: { points: 11, display: 'As' }
  }
} as const;