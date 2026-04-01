export type User = {
  id: string
  email: string
  username: string
}

// elementos que se podran colocar en el tablero
export type DevelopmentType = 'TREE' | 'PATH' | 'WATER' | 'BENCH'
export type ParkCellKind = 'PARK' | 'INFO_BOOTH'
export type DiceType = 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20'

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

// datos basicos de cada ronda
export type GameRound = {
  roundNumber: number
  dice: Dice[] | null
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
  rounds: GameRound[]
  penalties: {
    diceModifications: number
    isolatedRegions: number
  }
  score: null
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
