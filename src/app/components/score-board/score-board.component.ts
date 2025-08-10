import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';

@Component({
    standalone: true,
    selector: 'app-score-board',
    imports: [CommonModule],
    templateUrl: './score-board.component.html',
    styleUrls: ['./score-board.component.scss']
})
export class ScoreBoardComponent implements OnInit {
  playerScores: number[] = [0, 0, 0, 0];
  gameScores: number[] = [0, 0];
  currentRound = 1;

  constructor(private gameService: GameService) {}

  ngOnInit() {
    this.gameService.gameState$.subscribe(state => {
      this.playerScores = state.scores;
      this.gameScores = [
        state.scores[0] + state.scores[2],
        state.scores[1] + state.scores[3]
      ];
    });
  }
}