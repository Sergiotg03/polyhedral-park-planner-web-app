/*
https://docs.nestjs.com/providers
https://www.prisma.io/docs/orm/prisma-client/queries/crud
*/

import { Injectable, NotFoundException } from '@nestjs/common';
import { GameSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { selectRandomParkSheet } from './data/park-sheets';
import { INITIAL_ROUND, buildInitialGameState } from './game-state';

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

  // obtiene todas las partidas del usuario
  findAllForUser(userId: string) {
    return this.prisma.gameSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
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
}
