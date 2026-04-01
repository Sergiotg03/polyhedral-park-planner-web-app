import {
  INFO_BOOTH_COLUMN,
  INFO_BOOTH_ROW,
  type ParkSheetDefinition,
} from './data/park-sheets';

// ronda inicial y totales
export const INITIAL_ROUND = 1;
export const TOTAL_ROUNDS = 10;

// tipos de elementos, si es parque o info, y status de partida
export type DevelopmentType = 'TREE' | 'PATH' | 'WATER' | 'BENCH';
export type ParkCellKind = 'PARK' | 'INFO_BOOTH';
export type GameSessionStatusValue = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type DiceType = 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20';

// dados que se usan en cada ronda
export const GAME_DICE: ReadonlyArray<{ type: DiceType; sides: number }> = [
  { type: 'D4', sides: 4 },
  { type: 'D6', sides: 6 },
  { type: 'D8', sides: 8 },
  { type: 'D10', sides: 10 },
  { type: 'D12', sides: 12 },
  { type: 'D20', sides: 20 },
];

// info de cada casilla del tablero
export type ParkCellState = {
  row: number;
  column: number;
  kind: ParkCellKind;
  printedValue: number | null;
  development: DevelopmentType | null;
};

// resultado de cada dado
export type DiceState = {
  type: DiceType;
  sides: number;
  value: number;
  used: boolean;
};

// info de cada ronda
export type RoundState = {
  roundNumber: number;
  dice: DiceState[] | null;
  completed: boolean;
};

// info de la partida (staus, ronda actual, totales, hoja, penalizaciones, puntuaciónnd)
export type GameState = {
  version: 1;
  status: GameSessionStatusValue;
  currentRound: number;
  totalRounds: number;
  parkSheet: {
    number: number;
    name: string;
  };
  board: ParkCellState[][];
  rounds: RoundState[];
  penalties: {
    diceModifications: number;
    isolatedRegions: number;
  };
  score: null;
};

// recorre la matriz, convierte cada número en una celda con fila, columna, valor impreso y elemento, y crea el tablero
function buildInitialBoard(sheet: ParkSheetDefinition): ParkCellState[][] {
  return sheet.values.map((rowValues, rowIndex) => {
    return rowValues.map((printedValue, columnIndex) => {
      const row = rowIndex + 1;
      const column = columnIndex + 1;
      const isInfoBooth =
        row === INFO_BOOTH_ROW && column === INFO_BOOTH_COLUMN;

      return {
        row,
        column,
        kind: isInfoBooth ? 'INFO_BOOTH' : 'PARK',
        printedValue,
        development: null,
      };
    });
  });
}

// crea la ronda
function buildInitialRounds(): RoundState[] {
  return Array.from({ length: TOTAL_ROUNDS }, (_, index) => ({
    roundNumber: index + 1,
    dice: null,
    completed: false,
  }));
}

// tira todos los dados oficiales, el d10 devuelve 1-10
export function rollRoundDice(random = Math.random): DiceState[] {
  return GAME_DICE.map((dice) => ({
    type: dice.type,
    sides: dice.sides,
    value: Math.floor(random() * dice.sides) + 1,
    used: false,
  }));
}

// crea la partida inicial
export function buildInitialGameState(sheet: ParkSheetDefinition): GameState {
  return {
    version: 1,
    status: 'IN_PROGRESS',
    currentRound: INITIAL_ROUND,
    totalRounds: TOTAL_ROUNDS,
    parkSheet: {
      number: sheet.number,
      name: sheet.name,
    },
    board: buildInitialBoard(sheet),
    rounds: buildInitialRounds(),
    penalties: {
      diceModifications: 0,
      isolatedRegions: 0,
    },
    score: null,
  };
}
