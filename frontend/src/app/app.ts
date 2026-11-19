
import { Component, signal, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { services } from './services/game.service';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map, of, switchMap } from 'rxjs';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit{

  ngOnInit() {
  this.oidcSecurityService.checkAuth().subscribe(({ isAuthenticated }) => {
    console.log('Authenticated:', isAuthenticated);
  });
}

  gameService = inject(services);

  private readonly oidcSecurityService = inject(OidcSecurityService);

  isAuthenticated$ = this.oidcSecurityService.isAuthenticated$;

  login() {
    this.oidcSecurityService.authorize();
  }

  logout() {
    this.oidcSecurityService.logoff().subscribe();
  }

  changeTheme( theme: string ): void {
    document.body.classList.remove(
      'dark-theme',
      'forest-theme',
      'ocean-theme'
    );

    if ( theme !== 'light' ) {
      document.body.classList.add( `${theme}-theme` );
    }
  }

  protected readonly title = signal('Kassle');
  userData$ = this.oidcSecurityService.userData$;

  // which roles can use the admin page
  adminFeature = { allowedRoles: [ 'adminUserRole' ] };

  // cognito groups from the id token
  groups$ = this.isAuthenticated$.pipe(
    switchMap( ( { isAuthenticated } ) =>
      isAuthenticated ? this.oidcSecurityService.getPayloadFromIdToken() : of( null )
    ),
    map( ( payload ) => ( payload?.[ 'cognito:groups' ] ?? [] ) as string[] )
  );

  role$ = this.groups$.pipe(
    map( ( groups ) => groups.length ? groups.join( ', ' ) : null )
  );

  isAdmin$ = this.groups$.pipe(
    map( ( groups ) => groups.some( ( group ) => this.adminFeature.allowedRoles.includes( group ) ) )
  );
}
