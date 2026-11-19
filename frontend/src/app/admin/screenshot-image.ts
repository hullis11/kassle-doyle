import { Component, inject, input, OnInit, signal } from '@angular/core';
import { services } from '../services/game.service';

@Component({
  selector: 'app-screenshot-image',
  template: `
    @if ( url() ) {
      <img [src]="url()" class="img-fluid rounded border" alt="Game screenshot">
    } @else {
      <p class="text-secondary mb-0">Loading...</p>
    }
  `,
})
export class ScreenshotImage implements OnInit {
  s3Key = input.required<string>();

  gameService = inject( services );
  url = signal( '' );

  // only runs once the accordion is opened
  ngOnInit() {
    this.gameService.getScreenshotUrl( this.s3Key() ).subscribe( {
      next: ( url ) => this.url.set( url ),
      error: ( err ) => console.error( 'screenshot load failed:', err.status, err.error )
    } );
  }
}
