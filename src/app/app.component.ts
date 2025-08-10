import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { ScoreBoardComponent } from './components/score-board/score-board.component';

@Component({
  selector: 'app-root',
  standalone: true,
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
}