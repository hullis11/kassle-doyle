import { Service } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { gamestateModel, screenshotModel } from '../model/gamestate.model';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map, switchMap } from 'rxjs';

@Service()
export class services {
  backendURL = environment.backendUrl;
  getAuthHeaders() {
  return this.oidcSecurityService.getIdToken().pipe(
    map( token => new HttpHeaders( { Authorization: token } ) )
  );
}

  http = inject(HttpClient);
  oidcSecurityService = inject(OidcSecurityService);

  calculateWinner(game: gamestateModel): 'Red' | 'Blue' | null {
    const lines = [
      // Rows
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24],

      // Columns
      [0, 5, 10, 15, 20],
      [1, 6, 11, 16, 21],
      [2, 7, 12, 17, 22],
      [3, 8, 13, 18, 23],
      [4, 9, 14, 19, 24],

      // Diagonals
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20],
    ];

    for (const [a, b, c, d, e] of lines) {
      if (
        game.squares[a] &&
        game.squares[a] === game.squares[b] &&
        game.squares[a] === game.squares[c] &&
        game.squares[a] === game.squares[d] &&
        game.squares[a] === game.squares[e]
      ) {
        const winner = game.squares[a];

        if (winner === 'Red' || winner === 'Blue') {
          return winner;
        }
      }
    }

    return null;
  }

  activeGame: gamestateModel | null = null;

  // creating a new game
  newGame(redUsername: string, blueUsername: string) {
    const game = new gamestateModel();

    game.player = 'Red';
    game.winner = null;
    game.shiftLastTurn = false;
    game.dateTime = new Date();
    game.moveHistory = [];
    game.squares = Array(25).fill(null);
    game.redUsername = redUsername;
    game.blueUsername = blueUsername;

    this.activeGame = game;
    return game;
  }

    // loading games from json file
  loadGames() {
    this.getAuthHeaders().pipe(
      switchMap( headers =>
        this.http.get<gamestateModel[]>(
          this.backendURL + '/loadgames',
          { headers }
        )
      )
    ).subscribe( {
      next: ( gamesArray ) => {
        for ( const game of gamesArray ) {
          game.dateTime = new Date( game.dateTime );
        }
        this.gameSaves = gamesArray;
        console.log( 'Games Received:', this.gameSaves );
      },
      error: ( err ) => {
        console.error( 'loadGames failed:', err.status, err.message );
      }
    } );
  };

  // saving game states array
  gameSaves: gamestateModel[] = [];

  saveGame( game: gamestateModel ) {
  return this.getAuthHeaders().pipe(
    switchMap( headers =>
      this.http.post(
        this.backendURL + '/savegames',
        game,
        { headers }
      )
    )
  );
}

  // selecting old game
  gameSelect(selectedDateTime: Date) {
    for (const savedGame of this.gameSaves) {
      if (selectedDateTime === savedGame.dateTime) {
        return savedGame;
      }
    }

    return null;
    console.log(`urlCalled: ${this.backendURL + '/savegames'}`);
  };


  saveScreenshot( image: string, whoseTurn: string, gameId: string ) {
    return this.getAuthHeaders().pipe(
      switchMap( headers =>
        this.http.post(
          this.backendURL + '/screenshot',
          {
            image: image,
            whoseTurn: whoseTurn,
            gameId: gameId
          },
          { headers }
        )
      )
    );
  };

  // fetch a fresh 5-minute link for ONE screenshot (called when its accordion opens)
  getScreenshotUrl( s3Key: string ) {
    return this.getAuthHeaders().pipe(
      switchMap( headers =>
        this.http.get<{ url: string }>(
          this.backendURL + '/screenshoturl',
          { headers, params: { key: s3Key } }
        )
      ),
      map( res => res.url )
    );
  };

  // saving winner
// saving winner
saveWinner( game: gamestateModel ) {
  return this.getAuthHeaders().pipe(
    switchMap( headers =>
      this.http.post(
        this.backendURL + '/savewinner',
        game,
        { headers }
      )
    )
  );
};

  leaderboardArray = signal<{
    username: string;
    wins: number;
    losses: number;
  }[]>([]);

  loadLeaderboard() {
    this.getAuthHeaders().pipe(
      switchMap( headers =>
        this.http.get<{
          username: string;
          wins: number;
          losses: number;
        }[]>( this.backendURL + '/leaderboard', { headers } )
      )
    ).subscribe( {
      next: ( records ) => {
        this.leaderboardArray.set( records );
      },
      error: ( err ) => {
        console.error( 'loadLeaderboard failed:', err.status, err.message );
      }
    } );
  };

  getGames() {
    return this.getAuthHeaders().pipe(
      switchMap( headers =>
        this.http.get<gamestateModel[]>(
          this.backendURL + '/loadgames',
          { headers }
        )
      ),
      map( games => games.map( game => ( {
        ...game,
        dateTime: new Date( game.dateTime )
      } ) ) )
    );
  };

  loadScreenshots() {
    return this.getAuthHeaders().pipe(
      switchMap( headers =>
        this.http.get<screenshotModel[]>(
          this.backendURL + '/loadscreenshots',
          { headers }
        )
      )
    );
  };

  // making it so they can click squares
  makeMove(game: gamestateModel, idx: number) {
    if (game.squares[idx] || game.winner) return;

    game.squares.splice(idx, 1, game.player);

    game.moveHistory.push({
      player: game.player,
      kind: 'place',
      index: idx,
    });

    game.winner = this.calculateWinner(game);

    if (game.winner) {
      this.saveWinner(game).subscribe(() => {
        this.loadLeaderboard();
      });
    }

    if (!game.winner) {
      game.player = game.player === 'Red' ? 'Blue' : 'Red';
    }
  }

  revShift(
    axis: 'row' | 'column',
    index: number,
    direction: 'left' | 'right' | 'up' | 'down',
    game: gamestateModel
  ): boolean {
    // select the previous move outta move history
    const last = game.moveHistory[game.moveHistory.length - 1];

    // if no previous move or it wasnt a shift, false
    if (!last || last.kind !== 'shift') return false;

    const opposite = last.opposite;

    for (const button of game.buttonsList) {
      if (
        button.axis === axis &&
        button.index === index &&
        button.direction === direction
      ) {
        return button.name === opposite;
      }
    }

    return false;
  }

  // shift row methodology
  shiftRow(
    rowIndex: number = 0,
    direction: 'left' | 'right',
    game: gamestateModel
  ) {
    // if its a reverse shift, exit
    if (game.winner || game.revShift) return;

    const startIndex = rowIndex * 5;
    const row = game.squares.slice(startIndex, startIndex + 5);

    if (direction === 'right') {
      const lastBox = row.pop();

      if (lastBox !== undefined) {
        row.unshift(lastBox);
      }
    } else {
      const firstBox = row.shift();

      if (firstBox !== undefined) {
        row.push(firstBox);
      }
    }

    const shiftButton = game.buttonsList.find(
      (button) =>
        button.axis === 'row' &&
        button.index === rowIndex &&
        button.direction === direction
    );

    if (!shiftButton) return;

    // apply shift to current board
    const newBoard = game.squares.slice();

    newBoard.splice(startIndex, 5, ...row);
    game.squares = newBoard;
    game.shiftLastTurn = true;
    game.winner = this.calculateWinner(game);

    // add move record
    game.moveHistory.push({
      player: game.player,
      kind: 'shift',
      axis: 'row',
      direction,
      opposite: shiftButton.opposite,
      index: rowIndex,
    });

    if (!game.winner) {
      game.player = game.player === 'Red' ? 'Blue' : 'Red';
    }

    if (game.winner) {
      this.saveWinner(game).subscribe(() => {
        this.loadLeaderboard();
      });
    }
  }

  // shift column methodology
  shiftColumn(
    columnIndex: number = 0,
    direction: 'up' | 'down',
    game: gamestateModel
  ) {
    // if its a reverse shift, exit
    if (game.winner || game.revShift) return;

    const column = [];

    for (let i = 0; i < 5; i++) {
      const hold = columnIndex + i * 5;
      column.push(game.squares[hold]);
    }

    if (direction === 'down') {
      const lastBox = column.pop();

      if (lastBox !== undefined) {
        column.unshift(lastBox);
      }
    } else {
      const firstBox = column.shift();

      if (firstBox !== undefined) {
        column.push(firstBox);
      }
    }

    const shiftButton = game.buttonsList.find(
      (button) =>
        button.axis === 'column' &&
        button.index === columnIndex &&
        button.direction === direction
    );

    if (!shiftButton) return;

    const newBoard = game.squares.slice();

    for (let i = 0; i < 5; i++) {
      // calculate the index thats getting affected
      const hold = columnIndex + i * 5;

      // replace the value at that spot with new col values
      newBoard[hold] = column[i];
    }

    game.squares = newBoard;
    game.shiftLastTurn = true;
    game.winner = this.calculateWinner(game);

    // add move record
    game.moveHistory.push({
      player: game.player,
      kind: 'shift',
      axis: 'column',
      direction,
      index: columnIndex,
      opposite: shiftButton.opposite,
    });

    if (!game.winner) {
      game.player = game.player === 'Red' ? 'Blue' : 'Red';
    }

    if (game.winner) {
      this.saveWinner(game).subscribe(() => {
        this.loadLeaderboard();
      });
    }
  }
}
