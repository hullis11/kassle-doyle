import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { services } from '../services/game.service';
import { gamestateModel, screenshotModel } from '../model/gamestate.model';
import { ScreenshotImage } from './screenshot-image';

@Component({
  imports: [ DatePipe, ScreenshotImage ],
  selector: 'app-admin',
  styleUrl: './admin.css',
  templateUrl: './admin.html',
})
export class Admin {

  gameService = inject(services);

  games = signal<gamestateModel[]>( [] );
  screenshots = signal<screenshotModel[]>( [] );
  sortKey = signal( 'dateTime' );
  sortAsc = signal( false );
  error = signal( '' );

  // turn any saved date into utc milliseconds so they all compare the same
  toUtc( value: any ) {
    return new Date( value ).getTime();
  }

  sortedGames = computed( () => {
    const key = this.sortKey();
    const dir = this.sortAsc() ? 1 : -1;

    // copy first so sorting doesn't change the original array
    return [...this.games()].sort( ( a: any, b: any ) => {
      // dates get converted to utc before comparing
      const x = key === 'dateTime' ? this.toUtc( a[key] ) : a[key];
      const y = key === 'dateTime' ? this.toUtc( b[key] ) : b[key];
      return x < y ? -dir : x > y ? dir : 0;
    } );
  } );

  // old screenshots from before gameId was saved
  unlinkedShots = computed( () => this.screenshots().filter( shot => !shot.gameId ) );

  // screenshots for one game, newest first
  shotsFor( gameId: string ) {
    return this.screenshots()
      .filter( shot => shot.gameId === gameId )
      .sort( ( a, b ) => this.toUtc( b.timestamp ) - this.toUtc( a.timestamp ) );
  }

   ngOnInit() {
    // screenshots first: that endpoint is the one that checks for admin
    this.gameService.loadScreenshots().subscribe( {
      next: ( screenshots ) => {
        this.screenshots.set( screenshots );

        this.gameService.getGames().subscribe( ( games ) => {
          this.games.set( games );
        } );
      },
      error: ( err ) => {
        console.error( 'admin load failed:', err.status, err.error );
        this.error.set( err.status === 403 ? 'Not an admin.' : 'Unable to load.' );
      }
    } );
  }

  sortBy( key: string ) {
    if ( this.sortKey() === key ) {
      this.sortAsc.set( !this.sortAsc() );
    } else {
      this.sortKey.set( key );
      // dates start newest first, everything else a-z
      this.sortAsc.set( key !== 'dateTime' );
    }
  }

  // table headers, key is the game field each column sorts by
  columns = [
    { key: 'gameId', label: 'Game ID' },
    { key: 'redUsername', label: 'Red' },
    { key: 'blueUsername', label: 'Blue' },
    { key: 'player', label: 'Turn' },
    { key: 'dateTime', label: 'Saved' },
  ];

  sortIcon( key: string ) {
    if ( this.sortKey() !== key ) return '';
    return this.sortAsc() ? '▲' : '▼';
  }
}
