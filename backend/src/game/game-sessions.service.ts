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
import {
  INITIAL_ROUND,
  buildInitialGameState,
  rollRoundDice,
  type GameState,
} from './game-state';

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

    return gameSession;
  }

  // tira los dados de la ronda actual y los guarda en el estado
  async rollDice(userId: string, id: string) {
    const gameSession = await this.findOneForUser(userId, id);

    if (gameSession.status !== GameSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('La partida no esta en curso');
    }

    const state = gameSession.state as unknown as GameState;
    const currentRound = state.rounds.find(
      (round) => round.roundNumber === state.currentRound,
    );

    if (!currentRound) {
      throw new BadRequestException('La ronda actual no existe');
    }

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
}
