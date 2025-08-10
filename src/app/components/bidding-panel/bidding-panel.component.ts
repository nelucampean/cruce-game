import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Suit } from '../../models/card.model';

@Component({
    selector: 'app-bidding-panel',
    imports: [CommonModule],
    templateUrl: './bidding-panel.component.html',
    styleUrls: ['./bidding-panel.component.scss']
})
export class BiddingPanelComponent {
  @Input() currentBid = 0;
  @Input() isPlayerTurn = false;
  @Output() bidMade = new EventEmitter<number>();

  selectedBid = 0;
  selectedSuit: Suit | null = null;

  suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
  bidOptions = [6, 7, 8, 9, 10];

  makeBid() {
    if (this.selectedBid > this.currentBid) {
      this.bidMade.emit(this.selectedBid);
    }
  }

  pass() {
    this.bidMade.emit(0);
  }

  canBid(bidValue: number): boolean {
    return this.isPlayerTurn && bidValue > this.currentBid;
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