import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, Suit } from '../../models/card.model';

@Component({
    standalone: true,
    selector: 'app-card',
    imports: [CommonModule],
    templateUrl: './card.component.html',
    styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() card!: Card;
  @Input() isPlayable = false;
  @Input() isSelected = false;
  @Output() cardClicked = new EventEmitter<Card>();

  onClick() {
    if (this.isPlayable) {
      this.cardClicked.emit(this.card);
    }
  }

  getCardDescription(): string {
    return `${this.card.displayValue} of ${this.card.suit}${this.isPlayable ? ', playable' : ''}`;
  }

  getSuitSymbol(suit: Suit): string {
    const symbols = {
      [Suit.SPADES]: '♠',
      [Suit.HEARTS]: '♥',
      [Suit.DIAMONDS]: '♦',
      [Suit.CLUBS]: '♣'
    };
    return symbols[suit];
  }
}