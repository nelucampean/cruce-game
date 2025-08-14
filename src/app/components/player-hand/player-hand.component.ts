import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, GamePhase, Suit } from '../../models/card.model';
import { GameService } from '../../services/game.service';
import { CruceRulesService } from '../../services/cruce-rules.service';
import { DeckService } from '../../services/deck.service';
import { CardComponent } from '../card/card.component';

@Component({
    standalone: true,
    selector: 'app-player-hand',
    imports: [CommonModule, CardComponent],
    templateUrl: './player-hand.component.html',
    styleUrls: ['./player-hand.component.scss']
})
export class PlayerHandComponent {
  @Input() cards: Card[] = [];
  @Input() isPlayerTurn = false;
  @Input() gamePhase: GamePhase = GamePhase.BIDDING;
  @Input() trumpSuit: Suit | null = null;
  @Input() currentTrick: Card[] = [];
  @Input() selectedCard: Card | null = null;
  @Input() availableMarriages: { suit: Suit; value: number }[] = [];
  @Output() cardPlayed = new EventEmitter<Card>();
  @Output() cardSelected = new EventEmitter<Card>();

  showCardTooltips = true;
  sortBySuit = true;

  constructor(
    private gameService: GameService,
    private cruceRules: CruceRulesService,
    private deckService: DeckService
  ) {}

  onCardClick(card: Card) {
    if (this.gamePhase !== GamePhase.PLAYING || !this.isPlayerTurn) {
      return;
    }

    if (this.isCardPlayable(card)) {
      card.playerID = 4 //todo make it players.lenght
      this.cardSelected.emit(card);
      this.cardPlayed.emit(card);
    }
  }

  isCardPlayable(card: Card): boolean {
    if (this.gamePhase !== GamePhase.PLAYING || !this.isPlayerTurn) {
      return false;
    }
    
    // Use the rules service to check playability
    const gameState = {
      currentTrick: this.currentTrick,
      trumpSuit: this.trumpSuit,
      currentPlayer: 0, // Assuming this is always the human player
      players: [{ hand: this.cards, isHuman: true, id: '1', name: 'You', score: 0 }],
      phase: this.gamePhase,
      bid: 0,
      bidder: -1,
      scores: [0, 0, 0, 0],
      gameScore: [0, 0],
      targetScore: 15,
      passedPlayers: []
    };
    
    return this.cruceRules.isCardPlayable(card, gameState);
  }

  isCardSelected(card: Card): boolean {
    return this.selectedCard?.id === card.id;
  }

  canAnnounceMarriageWith(card: Card): boolean {
    return this.cruceRules.canAnnounceMarriage(
      card,
      this.cards,
      this.currentTrick.length === 0
    );
  }

  getCardTooltip(card: Card): string {
    if (!this.showCardTooltips) return '';
    
    let tooltip = `${this.formatCardName(card)} (${card.points} points)`;
    
    if (this.gamePhase === GamePhase.PLAYING && this.isPlayerTurn) {
      if (this.isCardPlayable(card)) {
        tooltip += ' - Playable';
        
        if (this.canAnnounceMarriageWith(card)) {
          const marriageValue = this.getMarriageValue(card.suit);
          tooltip += ` - Can announce marriage (${marriageValue} pts)`;
        }
      } else {
        const reason = this.getPlayabilityReason(card);
        tooltip += ` - ${reason}`;
      }
    }
    
    return tooltip;
  }

  private getPlayabilityReason(card: Card): string {
    if (this.currentTrick.length === 0) return 'Can play any card when leading';
    
    const leadSuit = this.currentTrick[0].suit;
    const hasSuit = this.cards.some(c => c.suit === leadSuit);
    const hasTrump = this.trumpSuit ? this.cards.some(c => c.suit === this.trumpSuit) : false;
    
    if (hasSuit && card.suit !== leadSuit) {
      return `Must follow suit (${this.formatSuitName(leadSuit)})`;
    }
    
    if (!hasSuit && this.trumpSuit && leadSuit !== this.trumpSuit && hasTrump && card.suit !== this.trumpSuit) {
      return `Must play trump (${this.formatSuitName(this.trumpSuit)})`;
    }
    
    return 'Playable';
  }

  getMarriageValue(suit: Suit): number {
    return this.cruceRules.calculateMarriagePoints(suit, this.trumpSuit);
  }

  formatCardName(card: Card): string {
    return this.deckService.getCardDisplayName(card);
  }

  formatSuitName(suit: Suit): string {
    return this.deckService.getSuitDisplayName(suit);
  }

  getSortedCards(): Card[] {
    if (!this.sortBySuit) {
      return [...this.cards];
    }

    return [...this.cards].sort((a, b) => {
      // First sort by suit
      if (a.suit !== b.suit) {
        const suitOrder = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
        const aIndex = suitOrder.indexOf(a.suit);
        const bIndex = suitOrder.indexOf(b.suit);
        
        // Trump suit comes first
        if (this.trumpSuit) {
          if (a.suit === this.trumpSuit && b.suit !== this.trumpSuit) return -1;
          if (b.suit === this.trumpSuit && a.suit !== this.trumpSuit) return 1;
        }
        
        return aIndex - bIndex;
      }
      
      // Then sort by value within suit
      return a.value - b.value;
    });
  }

  getCardsByStatus() {
    const playableCards = this.cards.filter(card => this.isCardPlayable(card));
    const marriageCards = this.cards.filter(card => this.canAnnounceMarriageWith(card));
    const unplayableCards = this.cards.filter(card => !this.isCardPlayable(card));
    
    return {
      playable: playableCards,
      marriage: marriageCards,
      unplayable: unplayableCards
    };
  }

  toggleSorting() {
    this.sortBySuit = !this.sortBySuit;
  }

  toggleTooltips() {
    this.showCardTooltips = !this.showCardTooltips;
  }

  trackByCardId(index: number, card: Card): string {
    return card.id;
  }

  // CSS class helpers for template
  getCardClasses(card: Card): string {
    const classes = ['card'];
    
    if (this.isCardSelected(card)) {
      classes.push('selected');
    }
    
    if (this.isCardPlayable(card)) {
      classes.push('playable');
    } else if (this.gamePhase === GamePhase.PLAYING && this.isPlayerTurn) {
      classes.push('unplayable');
    }
    
    if (this.canAnnounceMarriageWith(card)) {
      classes.push('marriage-eligible');
    }
    
    // Trump suit highlighting
    if (this.trumpSuit === card.suit) {
      classes.push('trump-card');
    }
    
    return classes.join(' ');
  }

  // Hand analysis for display
  getHandSummary(): { totalPoints: number; trumpCards: number; marriages: number; highCards: number } {
    const totalPoints = this.cards.reduce((sum, card) => sum + card.points, 0);
    const trumpCards = this.trumpSuit ? this.cards.filter(c => c.suit === this.trumpSuit).length : 0;
    const highCards = this.cards.filter(c => c.value >= 10).length;
    
    // Count marriages
    const suits = [Suit.ROSU, Suit.GHINDA, Suit.VERDE, Suit.DUBA];
    let marriages = 0;
    suits.forEach(suit => {
      const hasQueen = this.cards.some(c => c.suit === suit && c.value === 3);
      const hasKing = this.cards.some(c => c.suit === suit && c.value === 4);
      if (hasQueen && hasKing) marriages++;
    });
    
    return { totalPoints, trumpCards, marriages, highCards };
  }
}