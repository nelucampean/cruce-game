import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';
import { CruceRulesService } from '../../services/cruce-rules.service';
import { DeckService } from '../../services/deck.service';
import { Card, GamePhase, Player, Suit, GameState } from '../../models/card.model';
import { PlayerHandComponent } from '../player-hand/player-hand.component';
import { BiddingPanelComponent } from '../bidding-panel/bidding-panel.component';
import { CardComponent } from '../card/card.component';
import { ScoreBoardComponent } from '../score-board/score-board.component';
import { MarriageDialogComponent } from '../../marriage-dialog/marriage-dialog.component';

@Component({
    standalone: true,
    selector: 'app-game-board',
    imports: [
        CommonModule,
        PlayerHandComponent,
        BiddingPanelComponent,
        CardComponent,
        ScoreBoardComponent,
        MarriageDialogComponent
    ],
    templateUrl: './game-board.component.html',
    styleUrls: ['./game-board.component.scss']
})
export class GameBoardComponent implements OnInit, OnDestroy {
  gameState!: GameState;
  private subscription!: Subscription;
  
  // UI state
  selectedCard: Card | null = null;
  availableMarriages: { suit: Suit; value: number }[] = [];
  showMarriageDialog = false;
  showGameHelp = false;
  showPlaySuggestion = false;
  playSuggestion: { card: Card; reason: string } | null = null;
  lastTrickWinner = '';
  gameMessages: string[] = [];

  constructor(
    private gameService: GameService,
    private playerService: PlayerService,
    private cruceRules: CruceRulesService,
    private deckService: DeckService
  ) {}

  ngOnInit() {
    this.subscription = this.gameService.gameState$.subscribe(state => {
      this.gameState = state;
      this.updateGameState();
    });

    this.gameService.startNewGame(15); // Play to 15 points
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private updateGameState() {
    // Update available marriages for current player
    if (this.gameState.phase === GamePhase.PLAYING && this.isHumanPlayerTurn()) {
      this.availableMarriages = this.gameService.getAvailableMarriages();
    }

    // Update play suggestion
    this.updatePlaySuggestion();

    // Add game messages for important events
    this.updateGameMessages();
  }

  private updatePlaySuggestion() {
    if (this.isHumanPlayerTurn() && this.gameState.phase === GamePhase.PLAYING) {
      this.playSuggestion = this.getPlaySuggestion();
    } else {
      this.playSuggestion = null;
    }
  }

  private updateGameMessages() {
    // Add messages for trump suit changes, bid results, etc.
    const messages: string[] = [];
    
    if (this.gameState.trumpSuit && this.gameState.bid > 0) {
      const bidderName = this.gameState.players[this.gameState.bidder]?.name || 'Unknown';
      messages.push(`${bidderName} won bid with ${this.gameState.bid}, trump: ${this.formatSuitName(this.gameState.trumpSuit)}`);
    }

    if (this.gameState.currentTrick.length === 4) {
      // Show last trick result briefly
      messages.push('Evaluating trick...');
    }

    this.gameMessages = messages;
  }

  // Missing methods from template
  getCurrentPhaseDescription(): string {
    switch (this.gameState.phase) {
      case GamePhase.BIDDING:
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        return `Bidding - ${currentPlayer?.name || 'Unknown'}'s turn`;
      case GamePhase.PLAYING:
        return `Playing - Round ${this.getTrickNumber()}`;
      case GamePhase.FINISHED:
        return 'Game Finished';
      default:
        return 'Game Status';
    }
  }

  getTotalHandPoints(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + card.points, 0);
}
  getCurrentHandScore(playerIndex: number): number {
    // Get the current hand/round score for a player from game state scores
    if (!this.gameState.players[playerIndex]) return 0;
    
    // Get score from game state scores array
    if (this.gameState.scores && this.gameState.scores[playerIndex] !== undefined) {
      return this.gameState.scores[playerIndex];
    }
    
    return 0;
  }

  private calculateCurrentHandScore(playerIndex: number): number {
    // Get current hand score from game state
    if (this.gameState.scores && this.gameState.scores[playerIndex] !== undefined) {
      return this.gameState.scores[playerIndex];
    }
    return 0;
  }

  private getTrickNumber(): number {
    // Calculate current trick number based on cards played
    const totalCardsPlayed = this.gameState.players.reduce((sum, player) => {
      return sum + (13 - player.hand.length); // Assuming 13 cards per player initially
    }, 0);
    return Math.floor(totalCardsPlayed / 4) + 1;
  }

  getPlayerName(playerIndex: number): string {
    return this.gameState.players[playerIndex]?.name || `Player ${playerIndex + 1}`;
  }

  // Bidding methods
  onBidMade(bid: number) {
    if (this.gameState.phase !== GamePhase.BIDDING) return;
    this.gameService.makeBid(bid);
  }

  // Card playing methods
  onCardPlayed(card: Card) {
    if (!this.isHumanPlayerTurn() || this.gameState.phase !== GamePhase.PLAYING) return;
    
    if (this.isCardPlayable(card)) {
      this.selectedCard = card;
      
      // Check if marriage can be announced
      if (this.canAnnounceMarriageWith(card) && this.availableMarriages.length > 0) {
        this.showMarriageDialog = true;
      } else {
        this.playCard(card, false);
      }
    }
  }

  playCard(card: Card, announceMarriage: boolean) {
    this.gameService.playCard(card, announceMarriage);
    this.selectedCard = null;
    this.showMarriageDialog = false;
  }

  onMarriageDecision(announce: boolean) {
    if (this.selectedCard) {
      this.playCard(this.selectedCard, announce);
    }
  }

  // Marriage methods
  canAnnounceMarriageWith(card: Card): boolean {
    return this.cruceRules.canAnnounceMarriage(
      card,
      this.gameState.players[this.gameState.currentPlayer].hand,
      this.gameState.currentTrick.length === 0
    );
  }

  getMarriageValue(suit: Suit): number {
    return this.cruceRules.calculateMarriagePoints(suit, this.gameState.trumpSuit);
  }

  // UI helper methods
  isHumanPlayerTurn(): boolean {
    return this.gameState.players[this.gameState.currentPlayer]?.isHuman || false;
  }

  getCurrentPlayerName(): string {
    return this.gameState.players[this.gameState.currentPlayer]?.name || '';
  }

  getHumanPlayer(): Player {
    return this.gameState.players.find(p => p.isHuman) || this.gameState.players[0];
  }

  getBotPlayers(): Player[] {
    return this.gameState.players.filter(p => !p.isHuman);
  }

  isCardPlayable(card: Card): boolean {
    return this.cruceRules.isCardPlayable(card, this.gameState);
  }

  getCardDescription(card: Card): string {
    const playable = this.isCardPlayable(card) ? ' (playable)' : '';
    const selected = this.selectedCard?.id === card.id ? ' (selected)' : '';
    return `${this.formatCardName(card)}${playable}${selected}`;
  }

  // Game analysis methods
  getPlaySuggestion(): { card: Card; reason: string } | null {
    const humanPlayer = this.getHumanPlayer();
    return this.playerService.getPlaySuggestion(
      humanPlayer.hand,
      this.gameState.currentTrick,
      this.gameState.trumpSuit,
      this.gameState.players
    );
  }

  getHandAnalysis() {
    const humanPlayer = this.getHumanPlayer();
    return this.playerService.getHandAnalysis(humanPlayer.hand, this.gameState.trumpSuit);
  }

  getBestTrumpSuit() {
    if (this.gameState.trumpSuit) return null;
    const humanPlayer = this.getHumanPlayer();
    const suggestion = this.cruceRules.suggestTrumpSuit(humanPlayer.hand);
    return suggestion.suit;
  }

  // Formatting methods
  formatCardName(card: Card): string {
    return this.deckService.getCardDisplayName(card);
  }

  formatSuitName(suit: Suit): string {
    return this.deckService.getSuitDisplayName(suit);
  }

  formatScore(score: number): string {
    return this.cruceRules.formatScore(score);
  }

  // Game flow methods
  getCurrentTrickDescription(): string {
    if (this.gameState.currentTrick.length === 0) return 'No cards played yet';
    
    const descriptions = this.gameState.currentTrick.map(card => 
      `${this.formatCardName(card)} of ${this.formatSuitName(card.suit)}`
    );
    return `Current trick: ${descriptions.join(', ')}`;
  }

  getGameSummary(): string {
    return this.cruceRules.getGameSummary(this.gameState);
  }

  getGameStats() {
    return this.gameService.getGameStats();
  }

  // Game control methods
  restartGame() {
    this.gameService.startNewGame(this.gameState.targetScore);
  }

  toggleHelp() {
    this.showGameHelp = !this.showGameHelp;
  }

  togglePlaySuggestion() {
    this.showPlaySuggestion = !this.showPlaySuggestion;
  }

  // Template helpers
  trackByIndex(index: number): number {
    return index;
  }

  trackByCardId(index: number, card: Card): string {
    return card.id;
  }

  getCardBacks(count: number): any[] {
    return Array(count).fill(0);
  }

  getDummyCard(): Card {
    return {
      suit: Suit.ROSU,
      value: 2,
      displayValue: 'Doiar',
      points: 2,
      id: 'dummy',
      imageUrl: this.deckService.getCardBackUrl()
    };
  }

  // Phase checking
  get GamePhase() {
    return GamePhase;
  }

  // Debugging (remove in production)
  debugGameState() {
    console.log('Current game state:', this.gameState);
    console.log('Game stats:', this.getGameStats());
    
    const violations = this.cruceRules.detectRuleViolations(this.gameState);
    if (violations.length > 0) {
      console.warn('Rule violations detected:', violations);
    }
    
    const validation = this.cruceRules.validateGameState(this.gameState);
    if (!validation.valid) {
      console.warn('Game state validation errors:', validation.errors);
    }
  }
}