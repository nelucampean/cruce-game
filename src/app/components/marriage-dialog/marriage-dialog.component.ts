import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, Suit } from '../../models/card.model';
import { DeckService } from '../../services/deck.service';
import { CruceRulesService } from '../../services/cruce-rules.service';
@Component({
  selector: 'app-marriage-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marriage-dialog.component.html',
  styleUrl: './marriage-dialog.component.scss'
})
export class MarriageDialogComponent {
  @Input() show = false;
  @Input() selectedCard: Card | null = null;
  @Input() trumpSuit: Suit | null = null;
  @Input() playerHand: Card[] = [];
  @Input() gameScore: number[] = [0, 0];
  @Input() currentBid = 0;

  @Output() announce = new EventEmitter<boolean>();
  @Output() cancel = new EventEmitter<void>();

  constructor(
    private deckService: DeckService,
    private cruceRules: CruceRulesService
  ) {}

  get marriageValue(): number {
    if (!this.selectedCard) return 0;
    return this.cruceRules.calculateMarriagePoints(this.selectedCard.suit, this.trumpSuit);
  }

  get isTrumpMarriage(): boolean {
    return this.selectedCard?.suit === this.trumpSuit;
  }

  get marriagePartner(): Card | null {
    if (!this.selectedCard) return null;

    const partnerValue = this.selectedCard.value === 3 ? 4 : 3;
    return this.playerHand.find(card =>
      card.suit === this.selectedCard!.suit && card.value === partnerValue
    ) || null;
  }

  onAnnounce() {
    this.announce.emit(true);
  }

  onPlayWithoutAnnouncement() {
    this.announce.emit(false);
  }

  onCancel() {
    this.cancel.emit();
  }

  onOverlayClick(event: Event) {
    // Close dialog when clicking overlay (but not the dialog content)
    this.onCancel();
  }

  getCardName(card: Card): string {
    return this.deckService.getCardDisplayName(card);
  }

  getSuitName(suit: Suit): string {
    return this.deckService.getSuitDisplayName(suit);
  }

  shouldRecommendAnnouncement(): boolean {
    return this.getAnnouncementAdvice().announce;
  }

  getAnnouncementAdvice(): { announce: boolean; reason: string } {
    if (!this.selectedCard) {
      return { announce: false, reason: 'No card selected' };
    }

    // Strategic factors to consider
    const isWinning = this.gameScore[0] > this.gameScore[1]; // Assuming player is team 0
    const pointsNeeded = (this.currentBid * 33) - this.gameScore[0];
    const marriageWorthIt = this.marriageValue >= pointsNeeded;

    // Always announce trump marriages - they're very valuable
    if (this.isTrumpMarriage) {
      return {
        announce: true,
        reason: 'Trump marriages are very valuable (40 points)'
      };
    }

    // If close to making bid, announce for guaranteed points
    if (pointsNeeded > 0 && marriageWorthIt) {
      return {
        announce: true,
        reason: `Need ${pointsNeeded} points to make bid`
      };
    }

    // If winning by a lot, might save marriage for later
    if (isWinning && this.gameScore[0] - this.gameScore[1] > 50) {
      return {
        announce: false,
        reason: 'Already winning comfortably, save for later'
      };
    }

    // Default to announcing regular marriages for guaranteed points
    return {
      announce: true,
      reason: 'Guaranteed points are usually better than risking it'
    };
  }
}
