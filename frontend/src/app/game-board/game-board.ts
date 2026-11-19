import { Component, OnInit } from '@angular/core';
import {Square} from '../square/square';
import { gamestateModel } from '../model/gamestate.model';
import { services } from '../services/game.service';
import { inject } from '@angular/core';
import html2canvas from 'html2canvas';

@Component({
  imports: [Square],
  selector: 'app-game-board',
  templateUrl: './game-board.html',
  styleUrl: './game-board.css',
})

export class GameBoard implements OnInit {

  game!: gamestateModel;
  listGames!: boolean;
  gameService = inject(services);

  constructor(){
    this.game = new gamestateModel();
    this.listGames = false;
  }

  async captureBoard(): Promise<string> {
  const canvas = await html2canvas(document.body);

  return canvas.toDataURL('image/png');
};

  async saveScreenshot(): Promise<void> {
    const image = await this.captureBoard();

    const whoseTurn = this.game.player === 'Red'
      ? this.game.redUsername
      : this.game.blueUsername;

    this.gameService.saveScreenshot(image, whoseTurn, this.game.gameId).subscribe({
      next: () => console.log('Screenshot saved successfully'),
      error: (error) => console.error('Failed to save screenshot:', error)
    });
  };

  //call new game command when the gameboard appears
  ngOnInit(): void{
    const activeGame = this.gameService.activeGame;

    if(activeGame !=null){
      this.game = activeGame;
    }

    this.listGames = false;
    this.gameService.loadGames();
    this.gameService.loadLeaderboard();
  };

  saveGame(): void{
    this.gameService.saveGame(this.game).subscribe(() => 
    this.gameService.loadGames())
  };

  // call a previous game
  restoreGame(selectedDateTime: Date): void{
    const savedGame = this.gameService.gameSelect(selectedDateTime);

    if(savedGame !== null){
      savedGame.winner = this.gameService.calculateWinner(savedGame);
      this.game = savedGame
      this.gameService.activeGame = savedGame;
    };
  }

}
