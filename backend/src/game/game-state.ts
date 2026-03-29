import {
  INFO_BOOTH_COLUMN,
  INFO_BOOTH_ROW,
  PARK_GRID_SIZE,
  type ParkSheetDefinition,
} from './data/park-sheets';

// ronda inicial y totales
export const INITIAL_ROUND = 1;
export const TOTAL_ROUNDS = 10;

// tipos de elementos, si es parque o info, y status de partida
export type DevelopmentType = 'TREE' | 'PATH' | 'WATER' | 'BENCH';
export type ParkCellKind = 'PARK' | 'INFO_BOOTH';
export type GameSessionStatusValue = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

// info de cada casilla del tablero
export type ParkCellState = {
  row: number;
  column: number;
  kind: ParkCellKind;
  printedValue: number | null;
  development: DevelopmentType | null;
};

// info de cada ronda
export type RoundState = {
  roundNumber: number;
  diceValues: number[] | null;
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
    diceValues: null,
    completed: false,
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
