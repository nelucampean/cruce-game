import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, GamePhase } from '../../models/card.model';
import { GameService } from '../../services/game.service';
import { CardComponent } from '../card/card.component';

@Component({
    selector: 'app-player-hand',
    imports: [CommonModule, CardComponent],
    templateUrl: './player-hand.component.html',
    styleUrls: ['./player-hand.component.scss']
})
export class PlayerHandComponent {
  @Input() cards: Card[] = [];
  @Input() isPlayerTurn = false;
  @Input() gamePhase: GamePhase = GamePhase.BIDDING;
  @Output() cardPlayed = new EventEmitter<Card>();

  selectedCard: Card | null = null;

  constructor(private gameService: GameService) {}

  onCardClick(card: Card) {
    if (this.isCardPlayable(card)) {
      this.selectedCard = card;
      this.cardPlayed.emit(card);
    }
  }

  isCardPlayable(card: Card): boolean {
    if (this.gamePhase !== GamePhase.PLAYING || !this.isPlayerTurn) {
      return false;
    }
    
    return this.gameService.isCardPlayable(card);
  }

  trackByCardId(index: number, card: Card): string {
    return card.id;
  }
}