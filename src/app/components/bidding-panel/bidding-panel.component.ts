import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Suit, Player } from '../../models/card.model';
import { PlayerService } from '../../services/player.service';
import { CruceRulesService } from '../../services/cruce-rules.service';

@Component({
    standalone: true,
    selector: 'app-bidding-panel',
    imports: [CommonModule],
    templateUrl: './bidding-panel.component.html',
    styleUrls: ['./bidding-panel.component.scss']
})
export class BiddingPanelComponent implements OnInit {
  @Input() currentBid = 0;
  @Input() currentPlayer: Player | null = null;
  @Input() isPlayerTurn = false;
  @Input() bidder = -1;
  @Input() passedPlayers: number[] = [];
  @Output() bidMade = new EventEmitter<number>();

  selectedBid = 0;
  showAdvice = false;
  biddingAdvice: { recommendedBid: number; reasoning: string } | null = null;
  handAnalysis: any = null;

  // Cruce bidding options - 1 to 4 game points (rarely bid higher than 4)
  bidOptions = [1, 2, 3, 4, 5, 6];

  constructor(
    private playerService: PlayerService,
    private cruceRules: CruceRulesService
  ) {}

  ngOnInit() {
    this.updateBiddingAdvice();
  }

  ngOnChanges() {
    this.updateBiddingAdvice();
  }

  private updateBiddingAdvice() {
    if (this.isPlayerTurn && this.currentPlayer?.hand) {
      this.biddingAdvice = this.cruceRules.getBiddingAdvice(this.currentPlayer.hand);
      this.handAnalysis = this.playerService.getHandAnalysis(this.currentPlayer.hand);
      
      // Auto-select recommended bid if valid
      if (this.biddingAdvice.recommendedBid > this.currentBid) {
        this.selectedBid = this.biddingAdvice.recommendedBid;
      } else {
        this.selectedBid = 0; // Default to pass
      }
    }
  }

  makeBid() {
    if (this.canBid(this.selectedBid)) {
      this.bidMade.emit(this.selectedBid);
      this.selectedBid = 0;
    }
  }

  pass() {
    this.bidMade.emit(0); // 0 represents passing
  }

  canBid(bidValue: number): boolean {
    return this.isPlayerTurn && this.cruceRules.isValidBid(bidValue, this.currentBid) && bidValue > 0;
  }

  canPass(): boolean {
    return this.isPlayerTurn;
  }

  toggleAdvice() {
    this.showAdvice = !this.showAdvice;
  }

  getBidReasonableness(bid: number): { reasonable: boolean; reason: string } {
    if (!this.currentPlayer?.hand) {
      return { reasonable: false, reason: 'No hand data available' };
    }
    return this.playerService.evaluateBidReasonableness(this.currentPlayer.hand, bid);
  }

  getPlayerStatus(playerIndex: number): string {
    if (this.bidder === playerIndex) {
      return `Bidder (${this.currentBid})`;
    } else if (this.passedPlayers.includes(playerIndex)) {
      return 'Passed';
    } else {
      return 'Active';
    }
  }

  getBiddingHistory(): string {
    if (this.currentBid === 0) {
      return 'No bids yet';
    }
    return `Current high bid: ${this.currentBid} (${this.passedPlayers.length} passed)`;
  }

  // Helper for template
  trackByIndex(index: number): number {
    return index;
  }
}