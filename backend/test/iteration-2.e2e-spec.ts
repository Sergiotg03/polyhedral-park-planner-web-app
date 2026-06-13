import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  GAME_DICE,
  type DiceType,
  type GameState,
} from '../src/game/game-state';
import { PrismaService } from '../src/prisma/prisma.service';

type TestUser = {
  email: string;
  token: string;
};

const TEST_EMAIL_DOMAIN = '@iteration2.test';

describe('Iteracion 2', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await app.close();
  });

  async function cleanTestData() {
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          endsWith: TEST_EMAIL_DOMAIN,
        },
      },
      select: {
        id: true,
      },
    });
    const testUserIds = testUsers.map((user) => user.id);

    if (testUserIds.length > 0) {
      await prisma.gameSession.deleteMany({
        where: {
          userId: {
            in: testUserIds,
          },
        },
      });
    }

    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: TEST_EMAIL_DOMAIN,
        },
      },
    });
  }

  async function createTestUser(username: string): Promise<TestUser> {
    const email = `${username}-${Date.now()}${TEST_EMAIL_DOMAIN}`;
    const password = 'Password123!';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username,
        password,
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    const token =
      loginResponse.body.access_token ??
      loginResponse.body.accessToken ??
      loginResponse.body.token;

    expect(token).toBeDefined();

    return {
      email,
      token,
    };
  }

  async function createGameSession(token: string) {
    const response = await request(app.getHttpServer())
      .post('/game-sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    return response.body;
  }

  function buildDice(
    values: Partial<Record<DiceType, number>>,
    usedDice: DiceType[] = [],
  ) {
    return GAME_DICE.map((diceItem) => ({
      type: diceItem.type,
      sides: diceItem.sides,
      value: values[diceItem.type] ?? 1,
      used: usedDice.includes(diceItem.type),
    }));
  }

  async function updateSessionState(sessionId: string, state: GameState) {
    await prisma.gameSession.update({
      where: {
        id: sessionId,
      },
      data: {
        state: state as unknown as Prisma.InputJsonValue,
      },
    });
  }

  function getCurrentRound(state: GameState) {
    const round = state.rounds.find(
      (roundItem) => roundItem.roundNumber === state.currentRound,
    );

    if (!round) {
      throw new Error('No se ha encontrado la ronda actual');
    }

    return round;
  }

  function findEmptyParkCell(state: GameState, differentFrom?: number) {
    for (const row of state.board) {
      for (const cell of row) {
        const hasDifferentValue =
          differentFrom === undefined || cell.printedValue !== differentFrom;

        if (
          cell.kind === 'PARK' &&
          !cell.development &&
          cell.printedValue !== null &&
          hasDifferentValue
        ) {
          return cell;
        }
      }
    }

    throw new Error('No se ha encontrado una casilla valida para la prueba');
  }

  it('P2-01 crea una partida con tablero y ronda inicial', async () => {
    const user = await createTestUser('it2create');
    const gameSession = await createGameSession(user.token);

    expect(gameSession.state.currentRound).toBe(1);
    expect(gameSession.state.totalRounds).toBe(10);
    expect(gameSession.state.board).toHaveLength(9);
    expect(gameSession.state.board[0]).toHaveLength(9);
    expect(gameSession.state.rounds).toHaveLength(10);
  });

  it('P2-02 tira los seis dados y no permite repetir tirada', async () => {
    const user = await createTestUser('it2roll');
    const gameSession = await createGameSession(user.token);

    const firstRoll = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/roll-dice`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(201);

    const currentRound = getCurrentRound(firstRoll.body.state as GameState);

    expect(currentRound.dice).toHaveLength(6);
    expect(currentRound.dice?.map((diceItem) => diceItem.type)).toEqual([
      'D4',
      'D6',
      'D8',
      'D10',
      'D12',
      'D20',
    ]);

    await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/roll-dice`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(400);
  });

  it('P2-03 desbloquea un árbol con una suma valida', async () => {
    const user = await createTestUser('it2unlock');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;
    const currentRound = getCurrentRound(state);

    currentRound.dice = buildDice({ D4: 4 });
    await updateSessionState(gameSession.id, state);

    const response = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/unlock-development`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        developmentType: 'TREE',
        diceTypes: ['D4'],
      })
      .expect(201);

    const updatedRound = getCurrentRound(response.body.state as GameState);
    const d4 = updatedRound.dice?.find((diceItem) => diceItem.type === 'D4');

    expect(d4?.used).toBe(true);
    expect(updatedRound.unlockedDevelopments).toContainEqual({
      type: 'TREE',
      placedCount: 0,
    });
  });

  it('P2-04 rechaza desbloquear un elemento con rango incorrecto', async () => {
    const user = await createTestUser('it2invalidunlock');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;
    const currentRound = getCurrentRound(state);

    currentRound.dice = buildDice({ D4: 4 });
    await updateSessionState(gameSession.id, state);

    await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/unlock-development`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        developmentType: 'BENCH',
        diceTypes: ['D4'],
      })
      .expect(400);
  });

  it('P2-05 coloca un elemento desbloqueado en una casilla exacta', async () => {
    const user = await createTestUser('it2place');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;
    const currentRound = getCurrentRound(state);
    const targetCell = findEmptyParkCell(state);

    currentRound.dice = buildDice({
      D20: targetCell.printedValue ?? 1,
    });
    currentRound.unlockedDevelopments = [{ type: 'TREE', placedCount: 0 }];
    await updateSessionState(gameSession.id, state);

    const response = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/place-development`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        developmentType: 'TREE',
        diceTypes: ['D20'],
        row: targetCell.row,
        column: targetCell.column,
      })
      .expect(201);

    const updatedState = response.body.state as GameState;
    const updatedCell =
      updatedState.board[targetCell.row - 1][targetCell.column - 1];
    const updatedRound = getCurrentRound(updatedState);
    const d20 = updatedRound.dice?.find((diceItem) => diceItem.type === 'D20');

    expect(updatedCell.development).toBe('TREE');
    expect(d20?.used).toBe(true);
    expect(updatedRound.unlockedDevelopments[0].placedCount).toBe(1);
  });

  it('P2-06 rechaza colocar en una casilla que no coincide con la suma', async () => {
    const user = await createTestUser('it2invalidplace');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;
    const currentRound = getCurrentRound(state);
    const diceValue = 10;
    const targetCell = findEmptyParkCell(state, diceValue);

    currentRound.dice = buildDice({
      D20: diceValue,
    });
    currentRound.unlockedDevelopments = [{ type: 'TREE', placedCount: 0 }];
    await updateSessionState(gameSession.id, state);

    await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/place-development`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        developmentType: 'TREE',
        diceTypes: ['D20'],
        row: targetCell.row,
        column: targetCell.column,
      })
      .expect(400);
  });

  it('P2-07 no avanza de ronda si todavía quedan acciones posibles', async () => {
    const user = await createTestUser('it2blockadvance');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;
    const currentRound = getCurrentRound(state);

    currentRound.dice = buildDice(
      { D4: 1 },
      ['D6', 'D8', 'D10', 'D12', 'D20'],
    );
    await updateSessionState(gameSession.id, state);

    await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/advance-round`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(400);
  });

  it('P2-08 avanza de ronda cuando todos los dados estan usados', async () => {
    const user = await createTestUser('it2advance');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;
    const currentRound = getCurrentRound(state);

    currentRound.dice = buildDice(
      {},
      ['D4', 'D6', 'D8', 'D10', 'D12', 'D20'],
    );
    await updateSessionState(gameSession.id, state);

    const response = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/advance-round`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(201);

    expect(response.body.state.currentRound).toBe(2);
    expect(response.body.state.rounds[0].completed).toBe(true);
  });

  it('P2-09 no permite acceder a una partida de otro usuario', async () => {
    const owner = await createTestUser('it2owner');
    const otherUser = await createTestUser('it2other');
    const gameSession = await createGameSession(owner.token);

    await request(app.getHttpServer())
      .get(`/game-sessions/${gameSession.id}`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .expect(404);
  });
});
