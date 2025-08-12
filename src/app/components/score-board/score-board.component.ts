import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameService } from '../../services/game.service';
import { CruceRulesService } from '../../services/cruce-rules.service';
import { GameState, GamePhase, Suit } from '../../models/card.model';

@Component({
    standalone: true,
    selector: 'app-score-board',
    imports: [CommonModule],
    templateUrl: './score-board.component.html',
    styleUrls: ['./score-board.component.scss']
})
export class ScoreBoardComponent implements OnInit, OnDestroy {
[x: string]: any;
  @Input() compact = false; // For smaller displays
  
  gameState!: GameState;
  private subscription!: Subscription;
  
  // Display properties
  showDetailedScores = false;
  animateScoreChange = false;
  previousGameScores = [0, 0];

  constructor(
    private gameService: GameService,
    private cruceRules: CruceRulesService
  ) {}

  ngOnInit() {
    this.subscription = this.gameService.gameState$.subscribe(state => {
      // Animate score changes
      if (state.gameScore[0] !== this.previousGameScores[0] || 
          state.gameScore[1] !== this.previousGameScores[1]) {
        this.animateScoreChange = true;
        setTimeout(() => this.animateScoreChange = false, 1000);
      }
      
      this.previousGameScores = [...state.gameScore];
      this.gameState = state;
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  // Team score calculations
  getTeamScore(team: number): number {
    return this.gameState.gameScore[team] || 0;
  }

  getCurrentHandTeamScore(team: number): number {
    // Team 0: players 0,2 | Team 1: players 1,3
    if (team === 0) {
      return (this.gameState.scores[0] || 0) + (this.gameState.scores[2] || 0);
    } else {
      return (this.gameState.scores[1] || 0) + (this.gameState.scores[3] || 0);
    }
  }

  getPlayerScore(playerIndex: number): number {
    return this.gameState.scores[playerIndex] || 0;
  }

  getPlayerName(playerIndex: number): string {
    return this.gameState.players[playerIndex]?.name || `Player ${playerIndex + 1}`;
  }

  // Game progress
  getGameProgress(team: number): number {
    const score = this.getTeamScore(team);
    return Math.min((score / this.gameState.targetScore) * 100, 100);
  }

  isWinning(team: number): boolean {
    const otherTeam = team === 0 ? 1 : 0;
    return this.getTeamScore(team) > this.getTeamScore(otherTeam);
  }

  isGameFinished(): boolean {
    return this.gameState.phase === GamePhase.FINISHED;
  }

  getWinningTeam(): number | null {
    if (!this.isGameFinished()) return null;
    return this.getTeamScore(0) >= this.gameState.targetScore ? 0 : 1;
  }

  // Bidding information
  getCurrentBidInfo(): string {
    if (this.gameState.bid === 0) {
      return 'No bid yet';
    }
    
    const bidderName = this.getPlayerName(this.gameState.bidder);
    return `${bidderName} bid ${this.gameState.bid}`;
  }

  getBidderTeam(): number | null {
    if (this.gameState.bidder === -1) return null;
    return this.gameState.bidder % 2;
  }

  isBidMakingTeam(team: number): boolean {
    const bidderTeam = this.getBidderTeam();
    return bidderTeam === team;
  }

  // Trump information
  getTrumpSuit(): Suit | null {
    return this.gameState.trumpSuit;
  }

  getTrumpSuitName(): string {
    if (!this.gameState.trumpSuit) return 'None';
    
    const suitNames = {
      [Suit.ROSU]: 'Roșu',
      [Suit.GHINDA]: 'Ghindă',
      [Suit.VERDE]: 'Verde',
      [Suit.DUBA]: 'Dubă'
    };
    
    return suitNames[this.gameState.trumpSuit];
  }

  // Hand progress
  getTricksPlayed(): number {
    return 6 - (this.gameState.players[0]?.hand?.length || 6);
  }

  getTricksRemaining(): number {
    return 6 - this.getTricksPlayed();
  }

  getHandProgressPercentage(): number {
    return (this.getTricksPlayed() / 6) * 100;
  }

  // Scoring predictions
  getCurrentHandGamePoints(team: number): number {
    const handPoints = this.getCurrentHandTeamScore(team);
    return this.cruceRules.convertToGamePoints(handPoints);
  }

  getBidStatus(): 'making' | 'failing' | 'unknown' {
    const bidderTeam = this.getBidderTeam();
    if (bidderTeam === null) return 'unknown';
    
    const bidderTeamHandPoints = this.getCurrentHandTeamScore(bidderTeam);
    const requiredPoints = this.gameState.bid * 33;
    
    // Only show definitive status if hand is mostly played
    if (this.getTricksPlayed() >= 4) {
      return bidderTeamHandPoints >= requiredPoints ? 'making' : 'failing';
    }
    
    return 'unknown';
  }

  // Display formatting
  formatScore(score: number): string {
    return this.cruceRules.formatScore(score);
  }

  getTeamName(team: number): string {
    if (team === 0) {
      return `${this.getPlayerName(0)} & ${this.getPlayerName(2)}`;
    } else {
      return `${this.getPlayerName(1)} & ${this.getPlayerName(3)}`;
    }
  }

  getTeamDisplayName(team: number): string {
    if (this.compact) {
      return team === 0 ? 'Your Team' : 'Opponents';
    }
    return this.getTeamName(team);
  }

  // CSS classes for styling
  getTeamScoreClass(team: number): string {
    const classes = ['team-score'];
    
    if (this.isWinning(team)) {
      classes.push('winning');
    }
    
    if (this.isBidMakingTeam(team)) {
      classes.push('bidding-team');
      
      const bidStatus = this.getBidStatus();
      if (bidStatus === 'making') {
        classes.push('making-bid');
      } else if (bidStatus === 'failing') {
        classes.push('failing-bid');
      }
    }
    
    if (this.animateScoreChange) {
      classes.push('score-change');
    }
    
    return classes.join(' ');
  }

  getProgressBarClass(team: number): string {
    const classes = ['progress-bar'];
    
    if (this.isWinning(team)) {
      classes.push('winning');
    }
    
    return classes.join(' ');
  }

  // Toggle methods
  toggleDetailedScores() {
    this.showDetailedScores = !this.showDetailedScores;
  }

  // Game statistics
  getGameStats() {
    return this.gameService.getGameStats();
  }

  getHandSummary(): string {
    const tricks = this.getTricksPlayed();
    const total = 6;
    
    if (tricks === 0) {
      return 'Hand just started';
    } else if (tricks === total) {
      return 'Hand completed';
    } else {
      return `${tricks}/${total} tricks played`;
    }
  }

  getBidRequirement(): string {
    if (this.gameState.bid === 0) return '';
    
    const requiredPoints = this.gameState.bid * 33;
    const bidderTeam = this.getBidderTeam();
    
    if (bidderTeam === null) return '';
    
    const currentPoints = this.getCurrentHandTeamScore(bidderTeam);
    const remaining = requiredPoints - currentPoints;
    
    if (remaining <= 0) {
      return `Bid made! (${currentPoints}/${requiredPoints})`;
    } else {
      return `Need ${remaining} more points (${currentPoints}/${requiredPoints})`;
    }
  }

  // Marriage tracking
  getAnnouncedMarriages(): { player: string; suit: Suit; value: number }[] {
    // This would need to be tracked in the game state
    // For now, return empty array as placeholder
    return [];
  }

  getTotalMarriagePoints(team: number): number {
    // Calculate total marriage points for a team
    // This would need to be implemented based on game state tracking
    return 0;
  }

  // Real-time game status
  getCurrentPhaseDescription(): string {
    switch (this.gameState.phase) {
      case GamePhase.BIDDING:
        const passedCount = this.gameState.passedPlayers.length;
        if (this.gameState.bid === 0) {
          return 'Bidding in progress - no bids yet';
        } else {
          return `Bidding: ${this.getCurrentBidInfo()} (${passedCount} passed)`;
        }
      
      case GamePhase.PLAYING:
        const currentTrickCount = this.gameState.currentTrick.length;
        if (currentTrickCount === 0) {
          return `Playing: ${this.getPlayerName(this.gameState.currentPlayer)} to lead`;
        } else {
          return `Playing: Trick in progress (${currentTrickCount}/4 cards)`;
        }
      
      case GamePhase.FINISHED:
        const winner = this.getWinningTeam();
        return winner !== null ? `Game finished: ${this.getTeamDisplayName(winner)} wins!` : 'Game finished';
      
      default:
        return 'Game status unknown';
    }
  }

  // Helper for templates
  trackByIndex(index: number): number {
    return index;
  }
}