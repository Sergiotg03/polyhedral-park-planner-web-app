import {
  INFO_BOOTH_COLUMN,
  INFO_BOOTH_ROW,
  type ParkSheetDefinition,
} from './data/park-sheets';
import {
  selectRandomScoringCards,
  type ScoringCardDefinition,
} from './data/scoring-cards';

// ronda inicial y totales
export const INITIAL_ROUND = 1;
export const TOTAL_ROUNDS = 10;
export const MAX_DICE_MODIFICATIONS = 12;

// tipos de elementos, si es parque o info, y status de partida
export type DevelopmentType = 'TREE' | 'PATH' | 'WATER' | 'BENCH';
export type ParkCellKind = 'PARK' | 'INFO_BOOTH';
export type GameSessionStatusValue = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type DiceType = 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20';
export type ScoringCardState = ScoringCardDefinition;

export const DEVELOPMENT_TYPES: ReadonlyArray<DevelopmentType> = [
  'TREE',
  'PATH',
  'WATER',
  'BENCH',
];

// rangos que vienen en la parte superior de la hoja
export const DEVELOPMENT_UNLOCK_RANGES: Record<
  DevelopmentType,
  { min: number; max: number | null }
> = {
  TREE: { min: 1, max: 4 },
  PATH: { min: 5, max: 8 },
  WATER: { min: 9, max: 12 },
  BENCH: { min: 13, max: null },
};

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

// elementos que se han desbloqueado solo en esta ronda
export type RoundDevelopmentState = {
  type: DevelopmentType;
  placedCount: number;
};

// info de cada ronda
export type RoundState = {
  roundNumber: number;
  dice: DiceState[] | null;
  unlockedDevelopments: RoundDevelopmentState[];
  completed: boolean;
};

// resultado de una carta en el desglose final
export type ScoringCardScoreState = {
  cardId: string;
  title: string;
  points: number;
  detail: string;
};

// requisito de una carta para ganar en solitario
export type VictoryRequirementState = {
  cardId: string;
  title: string;
  requirement: string;
  fulfilled: boolean;
  detail: string;
};

// puntuacion final de la partida
export type ScoreState = {
  cards: ScoringCardScoreState[];
  penalties: {
    diceModifications: number;
    isolatedRegions: number;
    isolatedRegionCount: number;
  };
  soloTarget: number;
  soloTargetBreakdown: string;
  soloTargetReached: boolean;
  victoryRequirements: VictoryRequirementState[];
  victoryAchieved: boolean;
  total: number;
};

// info de la partida (status, ronda actual, totales, hoja, penalizaciones y puntuacion)
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
  scoringCards: ScoringCardState[];
  rounds: RoundState[];
  penalties: {
    diceModifications: number;
  };
  score: ScoreState | null;
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
    unlockedDevelopments: [],
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

// devuelve que elemento se puede desbloquear con esa suma
export function getDevelopmentForUnlockValue(
  value: number,
): DevelopmentType | null {
  const development = DEVELOPMENT_TYPES.find((type) => {
    const range = DEVELOPMENT_UNLOCK_RANGES[type];
    const isGreaterThanMinimum = value >= range.min;
    const isLessThanMaximum = range.max === null || value <= range.max;

    return isGreaterThanMinimum && isLessThanMaximum;
  });

  return development ?? null;
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
    scoringCards: selectRandomScoringCards(),
    rounds: buildInitialRounds(),
    penalties: {
      diceModifications: 0,
    },
    score: null,
  };
}
