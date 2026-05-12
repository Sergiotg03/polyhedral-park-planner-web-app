export type User = {
  id: string
  email: string
  username: string
}

// elementos que se podran colocar en el tablero
export type DevelopmentType = 'TREE' | 'PATH' | 'WATER' | 'BENCH'
export type ParkCellKind = 'PARK' | 'INFO_BOOTH'
export type DiceType = 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20'

// carta de puntuacion elegida para la partida
export type ScoringCard = {
  id: string
  title: string
  soloTarget: number
}

// puntuacion de cada carta al final de la partida
export type ScoringCardScore = {
  cardId: string
  title: string
  points: number
  detail: string
}

// requisito gris de una carta para ganar en solitario
export type VictoryObjective = {
  cardId: string
  title: string
  requirement: string
  fulfilled: boolean
  detail: string
}

// desglose final de puntuacion
export type Score = {
  cards: ScoringCardScore[]
  penalties: {
    diceModifications: number
    isolatedRegions: number
    isolatedRegionCount: number
  }
  soloTarget: number
  soloTargetBreakdown: string
  soloTargetReached: boolean
  victoryObjectives: VictoryObjective[]
  victoryAchieved: boolean
  total: number
}

// celda del tablero que viene del backend
export type ParkCell = {
  row: number
  column: number
  kind: ParkCellKind
  printedValue: number | null
  development: DevelopmentType | null
}

// dado de una ronda
export type Dice = {
  type: DiceType
  sides: number
  value: number
  used: boolean
}

// elementos desbloqueados en una ronda concreta
export type RoundDevelopment = {
  type: DevelopmentType
  placedCount: number
}

// datos basicos de cada ronda
export type GameRound = {
  roundNumber: number
  dice: Dice[] | null
  unlockedDevelopments: RoundDevelopment[]
  completed: boolean
}

// estado completo que se guarda en la partida
export type GameState = {
  version: 1
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
  currentRound: number
  totalRounds: number
  parkSheet: {
    number: number
    name: string
  }
  board: ParkCell[][]
  scoringCards: ScoringCard[]
  rounds: GameRound[]
  penalties: {
    diceModifications: number
  }
  score: Score | null
}

// partida completa devuelta por la api
export type GameSession = {
  id: string
  userId: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
  currentRound: number
  parkSheetNumber: number
  state: GameState
  createdAt: string
  updatedAt: string
  completedAt: string | null
}
