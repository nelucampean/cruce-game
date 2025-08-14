import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card, GamePhase, GameState, Player, Suit } from '../models/card.model';
import { DeckService } from './deck.service';
import { PlayerService } from './player.service';
import { CruceRulesService } from './cruce-rules.service'; // ADD THIS IMPORT

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
    scores: [0, 0, 0, 0],
    gameScore: [0, 0], // Team scores for game progression
    targetScore: 15,
    passedPlayers: []
  });

  gameState$ = this.gameState.asObservable();

  constructor(
    private deckService: DeckService,
    private playerService: PlayerService,
    private cruceRulesService: CruceRulesService  // ADD THIS INJECTION
  ) {}

  public testDeck: Card[] = [];
  private marriageAnnouncements: { player: number; suit: Suit; value: number }[] = [];
  private trickWinner = -1;

  startNewGame(targetScore: number = 15) {
    const deck = this.deckService.createDeck();
    this.testDeck = deck;
    const players: Player[] = [
      { id: '1', name: 'Tu', hand: [], score: 0, isHuman: true },
      { id: '2', name: 'Bot 1', hand: [], score: 0, isHuman: false },
      { id: '3', name: 'Bot 2', hand: [], score: 0, isHuman: false },
      { id: '4', name: 'Bot 3', hand: [], score: 0, isHuman: false }
    ];

    // Deal 6 cards to each player (24 total cards)
    this.deckService.dealCards(deck, players, 6);

    this.gameState.next({
      ...this.gameState.value,
      players,
      phase: GamePhase.BIDDING,
      currentPlayer: 0,
      bid: 0,
      bidder: -1,
      scores: [0, 0, 0, 0],
      gameScore: this.gameState.value.gameScore, // Keep existing game scores
      targetScore,
      currentTrick: [],
      trumpSuit: null,
      passedPlayers: []
    });

    this.marriageAnnouncements = [];
    this.trickWinner = -1;

    // Start bot bidding if first player is bot
    if (!players[0].isHuman) {
      setTimeout(() => this.processBotBidding(), 1000);
    }

    console.log('New Cruce hand started with 24 cards (6 per player)');
    console.log('Cards per suit: 2, 3, 4, 9, 10, As');
    console.log('Total points in deck:', this.deckService.getDeckInfo().pointsInDeck);
  }

  makeBid(bid: number) {
    const state = this.gameState.value;
    
    if (state.phase !== GamePhase.BIDDING) return;
    
    let newBid = state.bid;
    let newBidder = state.bidder;
    let passedPlayers = [...state.passedPlayers];

    if (bid > state.bid) {
      newBid = bid;
      newBidder = state.currentPlayer;
      console.log(`Player ${state.players[state.currentPlayer].name} bids ${bid}`);
    } else {
      // Player passes
      passedPlayers.push(state.currentPlayer);
      console.log(`Player ${state.players[state.currentPlayer].name} passes`);
    }

    const nextPlayer = (state.currentPlayer + 1) % 4;
    
    // Check if bidding is finished (3 players passed and 1 bid)
    if (passedPlayers.length === 3 && newBid > 0) {
      // Bidding finished, start playing
      this.gameState.next({
        ...state,
        bid: newBid,
        bidder: newBidder,
        phase: GamePhase.PLAYING,
        currentPlayer: newBidder,
        trumpSuit: null, // Will be determined by first card played
        passedPlayers
      });

      // If bidder is bot, let them play first card
      if (!state.players[newBidder].isHuman) {
        setTimeout(() => this.processBotPlay(), 1500);
      }
    } else if (passedPlayers.length === 4) {
      // All players passed, redeal
      console.log('All players passed, dealing new hand');
      this.startNewGame(state.targetScore);
    } else {
      // Continue bidding
      this.gameState.next({
        ...state,
        bid: newBid,
        bidder: newBidder,
        currentPlayer: nextPlayer,
        passedPlayers
      });

      // Process bot bidding
      if (!state.players[nextPlayer].isHuman) {
        setTimeout(() => this.processBotBidding(), 1000);
      }
    }
  }

  private processBotBidding() {
    const state = this.gameState.value;
    const currentPlayer = state.players[state.currentPlayer];
    
    if (currentPlayer.isHuman) return;

    // Get bot's bid decision
    const botBid = this.playerService.getBotBid(
      currentPlayer.hand,
      state.bid,
      state.currentPlayer
    );

    this.makeBid(botBid);
  }

  playCard(card: Card, announceMarriage?: boolean) {
    const state = this.gameState.value;
    
    if (!this.isCardPlayable(card)) {
      console.warn('Card not playable:', card);
      return;
    }

    // Handle marriage announcement
    if (announceMarriage && this.canAnnounceMarriage(card)) {
      const marriageValue = state.trumpSuit && 
        (card.suit === state.trumpSuit) ? 40 : 20;
      
      this.marriageAnnouncements.push({
        player: state.currentPlayer,
        suit: card.suit,
        value: marriageValue
      });

      console.log(`Player ${state.players[state.currentPlayer].name} announces marriage in ${card.suit} for ${marriageValue} points`);
    }

    // Set trump suit if this is the first card and bidder is playing
    let trumpSuit = state.trumpSuit;
    if (state.currentTrick.length === 0 && state.currentPlayer === state.bidder && !trumpSuit) {
      trumpSuit = card.suit;
      console.log(`Trump suit set to: ${trumpSuit}`);
    }

    
    // Remove card from player's hand
    const updatedPlayers = [...state.players];
    const currentPlayerHand = updatedPlayers[state.currentPlayer].hand;
    const cardIndex = currentPlayerHand.findIndex(c => c.id === card.id);
    if (cardIndex > -1) {
      currentPlayerHand.splice(cardIndex, 1);
    }

    // Add card to current trick
    const updatedTrick = [...state.currentTrick, card];
    const nextPlayer = (state.currentPlayer + 1) % 4;
    
    console.log(`Player ${state.players[state.currentPlayer].name} plays ${card.displayValue} of ${card.suit} (${card.points} points)`);

    if (state.currentTrick.length == 0){
        this.cruceRulesService.setLeadingPlayer(state.currentPlayer)
        console.log(`Set first player index  ${state.currentPlayer} name ${state.players[state.currentPlayer].name}`)
    }

    this.gameState.next({
      ...state,
      players: updatedPlayers,
      currentTrick: updatedTrick,
      currentPlayer: nextPlayer,
      trumpSuit
    });

    // Check if trick is complete (4 cards played)
    if (updatedTrick.length === 4) {
      setTimeout(() => this.evaluateTrick(), 1500); // Show trick for a moment
    } else {
      // Let bot play if it's their turn
      if (!state.players[nextPlayer].isHuman) {
        setTimeout(() => this.processBotPlay(), 1000);
      }
    }
  }

  private processBotPlay() {
    const state = this.gameState.value;
    const currentPlayer = state.players[state.currentPlayer];
    
    if (currentPlayer.isHuman || state.phase !== GamePhase.PLAYING) return;

    // Get bot's play decision
    const botPlay = this.playerService.getBotPlay(
      currentPlayer.hand,
      state.currentTrick,
      state.trumpSuit,
      state.currentPlayer,
      state.players,
      this.marriageAnnouncements
    );

    this.playCard(botPlay.card, botPlay.announceMarriage);
  }

  isCardPlayable(card: Card): boolean {
    const state = this.gameState.value;
    
    if (state.phase !== GamePhase.PLAYING) return false;
    
    // Use the rules service for consistent logic
    return this.cruceRulesService.isCardPlayable(card, state);
  }

  canAnnounceMarriage(card: Card): boolean {
    const state = this.gameState.value;
    
    // Can only announce at start of trick with King/Queen
    if (state.currentTrick.length !== 0) return false;
    if (card.value !== 3 && card.value !== 4) return false; // Queen(3) or King(4)
    
    const playerHand = state.players[state.currentPlayer].hand;
    const partnerValue = card.value === 3 ? 4 : 3; // If Queen, need King; if King, need Queen
    
    return playerHand.some(c => c.suit === card.suit && c.value === partnerValue);
  }

  private evaluateTrick() {
    const state = this.gameState.value;
    
    // Use the rules service for correct trick winner determination
    this.trickWinner = this.cruceRulesService.determineTrickWinnerPlayerIndex(state.currentTrick, state.trumpSuit);
    
    // Add debug logging to see what's happening
    const debugInfo = this.cruceRulesService.debugTrickEvaluation(state.currentTrick, state.trumpSuit);
    console.log('Trick evaluation:');
    console.log(debugInfo.explanation);
    
    console.log(`Trick won by ${state.players[this.trickWinner].name}`);
    
    // Calculate points in this trick
    const trickPoints = state.currentTrick.reduce((sum, card) => sum + card.points, 0);
    console.log(`Trick contains ${trickPoints} points`);
    
    // Award points to winner
    const updatedScores = [...state.scores];
    updatedScores[this.trickWinner] += trickPoints;

    // Check if hand is finished (all 6 tricks played)
    const totalCardsPlayed = state.players[0].hand.length === 0;
    
    if (totalCardsPlayed) {
      this.finishHand(updatedScores);
    } else {
      // Continue with next trick
      this.gameState.next({
        ...state,
        currentTrick: [],
        scores: updatedScores,
        currentPlayer: this.trickWinner
      });

      // Let bot play if it's their turn
      if (!state.players[this.trickWinner].isHuman) {
        setTimeout(() => this.processBotPlay(), 1000);
      }
    }
  }

  private finishHand(scores: number[]) {
    const state = this.gameState.value;
    
    // Add marriage points
    this.marriageAnnouncements.forEach(announcement => {
      scores[announcement.player] += announcement.value;
    });

    // Calculate team scores (players 0&2 vs 1&3)
    const team1Total = scores[0] + scores[2];
    const team2Total = scores[1] + scores[3];
    
    // Convert to game points (divide by 33, floor)
    let team1Points = Math.floor(team1Total / 33);
    let team2Points = Math.floor(team2Total / 33);

    // Check if bidding team made their bid
    const bidderTeam = state.bidder % 2; // 0 for team 1 (players 0,2), 1 for team 2 (players 1,3)
    const bidderTeamTotal = bidderTeam === 0 ? team1Total : team2Total;
    const bidderTeamPoints = bidderTeam === 0 ? team1Points : team2Points;
    
    const bidInPoints = state.bid * 33;
    
    if (bidderTeamTotal < bidInPoints) {
      // Bidder team failed - they get negative points, other team gets all their points
      if (bidderTeam === 0) {
        team1Points = -state.bid;
        // team2Points stays the same
      } else {
        team2Points = -state.bid;
        // team1Points stays the same
      }
      console.log(`Bidding team failed to make ${state.bid} (needed ${bidInPoints}, got ${bidderTeamTotal})`);
    }

    // Update game scores
    const newGameScore = [...state.gameScore];
    newGameScore[0] += team1Points;
    newGameScore[1] += team2Points;

    console.log(`Hand finished! Team 1: ${team1Total} points (${team1Points} game points), Team 2: ${team2Total} points (${team2Points} game points)`);
    console.log(`Game score: Team 1: ${newGameScore[0]}, Team 2: ${newGameScore[1]}`);

    // Check if game is won
    if (newGameScore[0] >= state.targetScore || newGameScore[1] >= state.targetScore) {
      this.gameState.next({
        ...state,
        currentTrick: [],
        scores,
        gameScore: newGameScore,
        phase: GamePhase.FINISHED
      });
      this.announceGameWinner(newGameScore);
    } else {
      // Start new hand
      this.gameState.next({
        ...state,
        currentTrick: [],
        scores,
        gameScore: newGameScore,
        phase: GamePhase.FINISHED // Will be updated in startNewGame
      });
      
      setTimeout(() => {
        this.startNewGame(state.targetScore);
      }, 3000);
    }
  }

  // REMOVE THIS OLD METHOD - it has the bug
  // private determineTrickWinner(trick: Card[], trumpSuit: Suit | null): number {
  //   // This method is now handled by CruceRulesService
  // }

  private announceGameWinner(gameScore: number[]) {
    const winner = gameScore[0] >= this.gameState.value.targetScore ? 'Your team' : 'Opponent team';
    console.log(`Game finished! ${winner} wins!`);
    console.log(`Final game score - Your team: ${gameScore[0]}, Opponents: ${gameScore[1]}`);
  }

  // Get current game statistics
  getGameStats() {
    const state = this.gameState.value;
    const cardsRemaining = state.players[0]?.hand?.length || 0;
    const tricksPlayed = 6 - cardsRemaining;
    
    return {
      cardsPerPlayer: 6,
      tricksPlayed,
      tricksRemaining: 6 - tricksPlayed,
      totalPoints: this.deckService.getDeckInfo().pointsInDeck,
      gameScore: state.gameScore,
      targetScore: state.targetScore,
      currentBid: state.bid,
      bidder: state.bidder,
      trumpSuit: state.trumpSuit
    };
  }

  // Helper method to get available marriage announcements for current player
  getAvailableMarriages(): { suit: Suit; value: number }[] {
    const state = this.gameState.value;
    if (state.currentTrick.length !== 0) return [];
    
    const playerHand = state.players[state.currentPlayer].hand;
    const marriages: { suit: Suit; value: number }[] = [];
    
    // Check each suit for King-Queen pairs
    const suits = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
    suits.forEach(suit => {
      const hasQueen = playerHand.some(c => c.suit === suit && c.value === 3);
      const hasKing = playerHand.some(c => c.suit === suit && c.value === 4);
      
      if (hasQueen && hasKing) {
        const value = state.trumpSuit === suit ? 40 : 20;
        marriages.push({ suit, value });
      }
    });
    
    return marriages;
  }
}