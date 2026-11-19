import { Service } from '@angular/core';
import { Square } from '../square/square';
import buttons from '../data/shift-buttons.json';

export type placeMove = {
  player: 'Red' | 'Blue';
  kind: 'place';
  index: number;
};

export type shiftMove = {
  player: 'Red' | 'Blue';
  kind: 'shift';
  axis: 'row' | 'column';
  index: number;
  opposite: string | null;
  direction: 'left' | 'right' | 'up' | 'down';
};

export class gamestateModel {
  constructor() {
    this.winner = null;
    this.dateTime = new Date();
    this.gameId = crypto.randomUUID();
  }

  // Defining properties in a gamestate
  player!: 'Red' | 'Blue';
  winner!: 'Red' | 'Blue' | null;
  shiftLastTurn!: boolean;
  gameId!: string;
  dateTime!: Date;
  squares: (string | null)[] = Array(25).fill(null);
  buttonsList = buttons;
  revShift!: boolean;
  opposite!: string;
  calculateWinner!: 'Red' | 'Blue' | null;
  redUsername!: string;
  blueUsername!: string;

  // creating move history
  moveHistory: (placeMove | shiftMove)[] = [];
};

export type screenshotModel = {
  screenshotId: string;
  userId: string;
  timestamp: string;
  whoseTurn: string;
  s3Key: string;
  gameId?: string; // missing on screenshots saved before gameId was added
};