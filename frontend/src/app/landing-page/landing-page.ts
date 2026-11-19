import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { gamestateModel } from '../model/gamestate.model';
import { services } from '../services/game.service';
import { inject } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-landing-page',
  styleUrl: './landing-page.css',
  templateUrl: './landing-page.html',
})
export class landingPage implements OnInit {
  enterText!: boolean;
  game!: gamestateModel;
  gameService = inject(services);
  router = inject(Router);

  ngOnInit(): void {
    this.gameService.loadGames();
  }

  // start new game fxn
  startNewGame(redUsername: string, blueUsername: string): void {
    this.game = this.gameService.newGame(redUsername, blueUsername);
    // leaving the route destroys this component
    this.router.navigate(['/game-board']);
  }

}