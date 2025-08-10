import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';
import { Card, GamePhase, Player, Suit } from '../../models/card.model';
import { PlayerHandComponent } from '../player-hand/player-hand.component';
import { BiddingPanelComponent } from '../bidding-panel/bidding-panel.component';
import { CardComponent } from '../card/card.component';

@Component({
      standalone: true,
    selector: 'app-game-board',
    imports: [
        CommonModule,
        PlayerHandComponent,
        BiddingPanelComponent,
        CardComponent
    ],
    templateUrl: './game-board.component.html',
    styleUrls: ['./game-board.component.scss']
})
export class GameBoardComponent implements OnInit {
  gamePhase: GamePhase = GamePhase.BIDDING;
  playerHand: Card[] = [];
  opponents: Player[] = [];
  currentTrick: Card[] = [];
  trumpSuit: Suit | null = null;
  currentBid = 0;
  isPlayerTurn = false;

  constructor(private gameService: GameService) {}

  ngOnInit() {
    this.gameService.gameState$.subscribe(state => {
      this.gamePhase = state.phase;
      this.playerHand = state.players[0]?.hand || [];
      this.opponents = state.players.slice(1);
      this.currentTrick = state.currentTrick;
      this.trumpSuit = state.trumpSuit;
      this.currentBid = state.bid;
      this.isPlayerTurn = state.currentPlayer === 0;
    });

    this.gameService.startNewGame();
  }

  onBidMade(bid: number) {
    this.gameService.makeBid(bid);
  }

  onCardPlayed(card: Card) {
    if (this.isPlayerTurn && this.gamePhase === GamePhase.PLAYING) {
      this.gameService.playCard(card);
    }
  }

  getCardBacks(count: number): any[] {
    return Array(count).fill(0);
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByCardId(index: number, card: Card): string {
    return card.id;
  }

  getCurrentTrickDescription(): string {
    if (this.currentTrick.length === 0) return 'No cards played yet';
    
    const descriptions = this.currentTrick.map(card => 
      `${card.displayValue} of ${card.suit}`
    );
    return `Current trick: ${descriptions.join(', ')}`;
  }
}