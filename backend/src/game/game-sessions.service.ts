/*
https://docs.nestjs.com/providers
https://www.prisma.io/docs/orm/prisma-client/queries/crud
*/

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { selectRandomParkSheet } from './data/park-sheets';
import { selectRandomScoringCards } from './data/scoring-cards';
import {
  INITIAL_ROUND,
  MAX_DICE_MODIFICATIONS,
  buildInitialGameState,
  getDevelopmentForUnlockValue,
  rollRoundDice,
  type DevelopmentType,
  type DiceState,
  type DiceType,
  type GameState,
  type ParkCellState,
  type RoundState,
} from './game-state';

type GameSessionActionData = {
  developmentType: DevelopmentType;
  diceTypes: DiceType[];
};

type ModifyDiceData = {
  diceType: DiceType;
  delta: -1 | 1;
};

type PlaceDevelopmentData = GameSessionActionData & {
  row: number;
  column: number;
};

// algunas partidas antiguas pueden no tener los campos nuevos
function normalizeGameState(state: GameState) {
  state.rounds.forEach((round) => {
    round.unlockedDevelopments ??= [];
  });

  state.penalties ??= {
    diceModifications: 0,
    isolatedRegions: 0,
  };
  state.penalties.diceModifications ??= 0;
  state.penalties.isolatedRegions ??= 0;
  state.scoringCards ??= selectRandomScoringCards();

  return state;
}

// busca la ronda actual dentro del estado de la partida
function getCurrentRound(state: GameState) {
  const round = state.rounds.find(
    (roundItem) => roundItem.roundNumber === state.currentRound,
  );

  if (!round) {
    throw new BadRequestException('La ronda actual no existe');
  }

  return round;
}

// valida que ya se hayan tirado dados en esta ronda
function getRolledDice(round: RoundState) {
  if (!round.dice) {
    throw new BadRequestException('Primero hay que tirar los dados');
  }

  return round.dice;
}

// valida que los dados elegidos existan y no se hayan usado antes
function getSelectedUnusedDice(round: RoundState, diceTypes: DiceType[]) {
  const roundDice = getRolledDice(round);
  const selectedDice = diceTypes.map((type) => {
    const dice = roundDice.find((roundDie) => roundDie.type === type);

    if (!dice) {
      throw new BadRequestException('Uno de los dados no existe');
    }

    if (dice.used) {
      throw new BadRequestException('Ese dado ya se ha usado');
    }

    return dice;
  });

  return selectedDice;
}

// busca un solo dado para poder modificarlo
function getUnusedDiceForModification(round: RoundState, diceType: DiceType) {
  const [dice] = getSelectedUnusedDice(round, [diceType]);

  return dice;
}

// suma los valores de los dados seleccionados
function sumDice(dice: DiceState[]) {
  return dice.reduce((total, diceItem) => total + diceItem.value, 0);
}

// genera todas las posibles combinaciones de dados que quedan
function getDiceSubsets(dice: DiceState[]) {
  const subsets: DiceState[][] = [];

  dice.forEach((diceItem) => {
    const subsetsWithDiceItem = subsets.map((subset) => [...subset, diceItem]);
    subsets.push([diceItem], ...subsetsWithDiceItem);
  });

  return subsets;
}

// obtiene una casilla concreta del tablero
function getCell(state: GameState, row: number, column: number) {
  return state.board[row - 1]?.[column - 1] ?? null;
}

// valida que la casilla sea de parque y aun no tenga elemento
function isEmptyParkCell(cell: ParkCellState | null) {
  return Boolean(cell && cell.kind === 'PARK' && !cell.development);
}

// comprueba si hay alguna casilla libre con ese numero exacto
function hasEmptyParkCellWithValue(state: GameState, value: number) {
  return state.board.some((row) =>
    row.some((cell) => isEmptyParkCell(cell) && cell.printedValue === value),
  );
}

// mira si alguna combinacion de dados podria colocarse en el tablero
function hasPlacementOption(state: GameState, dice: DiceState[]) {
  return getDiceSubsets(dice).some((subset) =>
    hasEmptyParkCellWithValue(state, sumDice(subset)),
  );
}

// comprueba si el elemento ya esta desbloqueado en esta ronda
function hasUnlockedDevelopment(round: RoundState, type: DevelopmentType) {
  return round.unlockedDevelopments.some(
    (development) => development.type === type,
  );
}

// devuelve el elemento desbloqueado para poder actualizarlo
function getUnlockedDevelopment(round: RoundState, type: DevelopmentType) {
  return round.unlockedDevelopments.find(
    (development) => development.type === type,
  );
}

// comprueba si se podria colocar algo con los dados que quedan
function hasPlaceActionAvailable(state: GameState, round: RoundState) {
  const hasDevelopmentUnlocked = round.unlockedDevelopments.length > 0;
  const unusedDice = getRolledDice(round).filter((dice) => !dice.used);

  return hasDevelopmentUnlocked && hasPlacementOption(state, unusedDice);
}

// comprueba si se podria desbloquear algun elemento con los dados que quedan
function hasUnlockActionAvailable(round: RoundState) {
  const unusedDice = getRolledDice(round).filter((dice) => !dice.used);
  const diceSubsets = getDiceSubsets(unusedDice);

  return diceSubsets.some((subset) => {
    const developmentType = getDevelopmentForUnlockValue(sumDice(subset));

    return Boolean(
      developmentType && !hasUnlockedDevelopment(round, developmentType),
    );
  });
}

// valida si la ronda puede terminarse
function canAdvanceRound(state: GameState, round: RoundState) {
  const dice = getRolledDice(round);
  const allDiceUsed = dice.every((diceItem) => diceItem.used);

  if (allDiceUsed) {
    return true;
  }

  return !(
    hasPlaceActionAvailable(state, round) || hasUnlockActionAvailable(round)
  );
}

@Injectable()
export class GameSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  // crea la partida con una hoja aleatoria y estado inicial, guarda status en json
  create(userId: string) {
    const parkSheet = selectRandomParkSheet();
    const state = buildInitialGameState(parkSheet);

    return this.prisma.gameSession.create({
      data: {
        userId,
        status: GameSessionStatus.IN_PROGRESS,
        currentRound: INITIAL_ROUND,
        parkSheetNumber: parkSheet.number,
        state: state as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // busca por id y usuario para no abrir partidas de otros usuarios
  async findOneForUser(userId: string, id: string) {
    const gameSession = await this.prisma.gameSession.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!gameSession) {
      throw new NotFoundException('No se ha encontrado la partida');
    }

    const state = normalizeGameState(gameSession.state as unknown as GameState);

    return {
      ...gameSession,
      state,
    };
  }

  // tira los dados de la ronda actual y los guarda en el estado
  async rollDice(userId: string, id: string) {
    const gameSession = await this.findOneForUser(userId, id);

    if (gameSession.status !== GameSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('La partida no esta en curso');
    }

    const state = normalizeGameState(gameSession.state as unknown as GameState);
    const currentRound = getCurrentRound(state);

    if (currentRound.dice) {
      throw new BadRequestException('La ronda actual ya tiene dados');
    }

    currentRound.dice = rollRoundDice();

    return this.prisma.gameSession.update({
      where: { id: gameSession.id },
      data: {
        state: state as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // modifica un dado en +1 o -1 y apunta una penalizacion
  async modifyDice(userId: string, id: string, actionData: ModifyDiceData) {
    const gameSession = await this.findOneForUser(userId, id);

    if (gameSession.status !== GameSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('La partida no esta en curso');
    }

    const state = normalizeGameState(gameSession.state as unknown as GameState);
    const currentRound = getCurrentRound(state);
    const dice = getUnusedDiceForModification(
      currentRound,
      actionData.diceType,
    );
    const nextValue = dice.value + actionData.delta;

    if (state.penalties.diceModifications >= MAX_DICE_MODIFICATIONS) {
      throw new BadRequestException('No quedan modificaciones de dados');
    }

    if (nextValue < 1) {
      throw new BadRequestException('El dado no puede bajar de 1');
    }

    dice.value = nextValue;
    state.penalties.diceModifications += 1;

    return this.prisma.gameSession.update({
      where: { id: gameSession.id },
      data: {
        state: state as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // desbloquea un elemento gastando uno o varios dados
  async unlockDevelopment(
    userId: string,
    id: string,
    actionData: GameSessionActionData,
  ) {
    const gameSession = await this.findOneForUser(userId, id);

    if (gameSession.status !== GameSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('La partida no esta en curso');
    }

    const state = normalizeGameState(gameSession.state as unknown as GameState);
    const currentRound = getCurrentRound(state);
    const selectedDice = getSelectedUnusedDice(
      currentRound,
      actionData.diceTypes,
    );
    const selectedSum = sumDice(selectedDice);
    const developmentForSum = getDevelopmentForUnlockValue(selectedSum);

    if (developmentForSum !== actionData.developmentType) {
      throw new BadRequestException(
        'La suma no sirve para desbloquear ese elemento',
      );
    }

    if (hasUnlockedDevelopment(currentRound, actionData.developmentType)) {
      throw new BadRequestException('Ese elemento ya esta desbloqueado');
    }

    selectedDice.forEach((dice) => {
      dice.used = true;
    });

    currentRound.unlockedDevelopments.push({
      type: actionData.developmentType,
      placedCount: 0,
    });

    return this.prisma.gameSession.update({
      where: { id: gameSession.id },
      data: {
        state: state as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // coloca un elemento desbloqueado en una casilla exacta
  async placeDevelopment(
    userId: string,
    id: string,
    actionData: PlaceDevelopmentData,
  ) {
    const gameSession = await this.findOneForUser(userId, id);

    if (gameSession.status !== GameSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('La partida no esta en curso');
    }

    const state = normalizeGameState(gameSession.state as unknown as GameState);
    const currentRound = getCurrentRound(state);
    const unlockedDevelopment = getUnlockedDevelopment(
      currentRound,
      actionData.developmentType,
    );

    if (!unlockedDevelopment) {
      throw new BadRequestException('Ese elemento no esta desbloqueado');
    }

    const cell = getCell(state, actionData.row, actionData.column);

    if (!isEmptyParkCell(cell)) {
      throw new BadRequestException('No se puede colocar aqui');
    }

    const selectedDice = getSelectedUnusedDice(
      currentRound,
      actionData.diceTypes,
    );
    const selectedSum = sumDice(selectedDice);

    if (cell?.printedValue !== selectedSum) {
      throw new BadRequestException(
        'La suma de los dados no coincide con la casilla',
      );
    }

    cell.development = actionData.developmentType;
    unlockedDevelopment.placedCount += 1;

    selectedDice.forEach((dice) => {
      dice.used = true;
    });

    return this.prisma.gameSession.update({
      where: { id: gameSession.id },
      data: {
        state: state as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // pasa de ronda si ya no hay acciones posibles o se han gastado los dados
  async advanceRound(userId: string, id: string) {
    const gameSession = await this.findOneForUser(userId, id);

    if (gameSession.status !== GameSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('La partida no esta en curso');
    }

    const state = normalizeGameState(gameSession.state as unknown as GameState);
    const currentRound = getCurrentRound(state);

    if (!canAdvanceRound(state, currentRound)) {
      throw new BadRequestException('Todavia quedan acciones validas');
    }

    currentRound.completed = true;

    if (state.currentRound >= state.totalRounds) {
      state.status = 'COMPLETED';

      return this.prisma.gameSession.update({
        where: { id: gameSession.id },
        data: {
          status: GameSessionStatus.COMPLETED,
          completedAt: new Date(),
          state: state as unknown as Prisma.InputJsonValue,
        },
      });
    }

    state.currentRound += 1;

    return this.prisma.gameSession.update({
      where: { id: gameSession.id },
      data: {
        currentRound: state.currentRound,
        state: state as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
