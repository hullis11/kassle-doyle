import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-square',
  templateUrl: './square.html',
  styleUrl: './square.css'
})

export class Square {
  value = input<string | null>(null);
}
