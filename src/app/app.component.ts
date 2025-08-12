import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { ScoreBoardComponent } from './components/score-board/score-board.component';
import { GameService } from './services/game.service';
import {Card } from './models/card.model'
@Component({
    selector: 'app-root',
    imports: [
        CommonModule,
        GameBoardComponent,
        ScoreBoardComponent
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'cruce-game';
  constructor(private gameService:GameService){

  }
  getAllCards(){
    return this.gameService.testDeck;
  }
  logImageError(card:Card){
    console.error("Error loading "+card);
  }
}