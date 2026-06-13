import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GameSessionStatus, Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SCORING_CARDS } from '../src/game/data/scoring-cards';
import {
  GAME_DICE,
  type DevelopmentType,
  type GameState,
  type ScoringCardState,
} from '../src/game/game-state';
import { PrismaService } from '../src/prisma/prisma.service';

type TestUser = {
  token: string;
};

type DevelopmentCounts = Record<DevelopmentType, number>;

const TEST_EMAIL_DOMAIN = '@iteration4.test';

jest.setTimeout(30000);

describe('Iteracion 4', () => {
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
    await app?.close();
  });

  async function cleanTestData() {
    const prismaService = prisma;

    if (!prismaService) {
      return;
    }

    const testUsers = await prismaService.user.findMany({
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
      await prismaService.gameSession.deleteMany({
        where: {
          userId: {
            in: testUserIds,
          },
        },
      });
    }

    await prismaService.user.deleteMany({
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

    return { token };
  }

  async function createGameSession(token: string) {
    const response = await request(app.getHttpServer())
      .post('/game-sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    return response.body;
  }

  async function updateSession(
    sessionId: string,
    state: GameState,
    status: GameSessionStatus,
    createdAt: Date,
  ) {
    await prisma.gameSession.update({
      where: {
        id: sessionId,
      },
      data: {
        status,
        currentRound: state.currentRound,
        createdAt,
        completedAt: status === GameSessionStatus.COMPLETED ? createdAt : null,
        state: state as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async function createPreparedSession(
    token: string,
    createdAt: Date,
    prepareState: (state: GameState) => GameSessionStatus,
  ) {
    const gameSession = await createGameSession(token);
    const state = gameSession.state as GameState;
    const status = prepareState(state);

    await updateSession(gameSession.id, state, status, createdAt);

    return {
      id: gameSession.id,
      state,
    };
  }

  function buildUsedDice() {
    return GAME_DICE.map((diceItem) => ({
      type: diceItem.type,
      sides: diceItem.sides,
      value: 1,
      used: true,
    }));
  }

  function getScoringCard(id: string): ScoringCardState {
    const card = SCORING_CARDS.find((scoringCard) => scoringCard.id === id);

    if (!card) {
      throw new Error(`No existe la carta ${id}`);
    }

    return card;
  }

  function cleanBoard(state: GameState) {
    state.board.forEach((row) => {
      row.forEach((cell) => {
        cell.development = null;
      });
    });
  }

  function placeDevelopment(
    state: GameState,
    row: number,
    column: number,
    development: DevelopmentType,
  ) {
    state.board[row - 1][column - 1].development = development;
  }

  function prepareInProgressState(state: GameState, currentRound: number) {
    state.status = 'IN_PROGRESS';
    state.currentRound = currentRound;
    state.score = null;

    state.rounds.forEach((round) => {
      round.completed = round.roundNumber < currentRound;
    });

    return GameSessionStatus.IN_PROGRESS;
  }

  function prepareCompletedState(state: GameState, withWinningBoard = false) {
    state.status = 'COMPLETED';
    state.currentRound = 10;
    state.score = null;
    state.scoringCards = [
      getScoringCard('04-los-mejores-asientos-de-la-casa'),
      getScoringCard('07-un-lugar-sombreado-para-descansar'),
      getScoringCard('09-centro-de-atencion'),
    ];

    state.rounds.forEach((round) => {
      round.completed = true;
      round.dice = buildUsedDice();
    });

    cleanBoard(state);

    if (withWinningBoard) {
      buildWinningBoard(state);
    }

    return GameSessionStatus.COMPLETED;
  }

  function buildWinningBoard(state: GameState) {
    for (let row = 2; row <= 7; row += 1) {
      for (let column = 3; column <= 7; column += 1) {
        const isInfoBooth = row === 5 && column === 5;

        if (!isInfoBooth) {
          const development = (row + column) % 2 === 0 ? 'BENCH' : 'TREE';
          placeDevelopment(state, row, column, development);
        }
      }
    }
  }

  function createEmptyDevelopmentCounts(): DevelopmentCounts {
    return {
      TREE: 0,
      PATH: 0,
      WATER: 0,
      BENCH: 0,
    };
  }

  function countDevelopments(state: GameState) {
    const counts = createEmptyDevelopmentCounts();

    state.board.forEach((row) => {
      row.forEach((cell) => {
        if (cell.development) {
          counts[cell.development] += 1;
        }
      });
    });

    return counts;
  }

  function addDevelopmentCounts(
    total: DevelopmentCounts,
    counts: DevelopmentCounts,
  ) {
    total.TREE += counts.TREE;
    total.PATH += counts.PATH;
    total.WATER += counts.WATER;
    total.BENCH += counts.BENCH;
  }

  it('P4-01 lista solo las partidas del usuario ordenadas de mas reciente a mas antigua', async () => {
    const user = await createTestUser('it4history');
    const otherUser = await createTestUser('it4other');

    const oldestSession = await createPreparedSession(
      user.token,
      new Date('2026-05-01T10:00:00.000Z'),
      (state) => prepareInProgressState(state, 1),
    );
    const newestSession = await createPreparedSession(
      user.token,
      new Date('2026-05-03T10:00:00.000Z'),
      (state) => prepareInProgressState(state, 3),
    );
    const middleSession = await createPreparedSession(
      user.token,
      new Date('2026-05-02T10:00:00.000Z'),
      (state) => prepareInProgressState(state, 2),
    );

    await createPreparedSession(
      otherUser.token,
      new Date('2026-05-04T10:00:00.000Z'),
      (state) => prepareInProgressState(state, 4),
    );

    const response = await request(app.getHttpServer())
      .get('/game-sessions')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    const sessionIds = response.body.map((session: { id: string }) => {
      return session.id;
    });

    expect(sessionIds).toEqual([
      newestSession.id,
      middleSession.id,
      oldestSession.id,
    ]);
  });

  it('P4-02 devuelve los datos necesarios para cargar partidas en curso y finalizadas', async () => {
    const user = await createTestUser('it4load');
    const inProgressSession = await createPreparedSession(
      user.token,
      new Date('2026-05-01T10:00:00.000Z'),
      (state) => prepareInProgressState(state, 5),
    );
    const completedSession = await createPreparedSession(
      user.token,
      new Date('2026-05-02T10:00:00.000Z'),
      (state) => prepareCompletedState(state, false),
    );

    const response = await request(app.getHttpServer())
      .get('/game-sessions')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    const completed = response.body.find(
      (session: { id: string }) => session.id === completedSession.id,
    );
    const inProgress = response.body.find(
      (session: { id: string }) => session.id === inProgressSession.id,
    );

    expect(inProgress.status).toBe('IN_PROGRESS');
    expect(inProgress.state.currentRound).toBe(5);
    expect(inProgress.state.score).toBeNull();

    expect(completed.status).toBe('COMPLETED');
    expect(completed.completedAt).not.toBeNull();
    expect(completed.state.score).not.toBeNull();
    expect(typeof completed.state.score.total).toBe('number');
    expect(completed.state.score.victoryAchieved).toBe(false);
  });

  it('P4-03 permite calcular las estadisticas generales del home', async () => {
    const user = await createTestUser('it4stats');
    const expectedCounts = createEmptyDevelopmentCounts();

    const winningSession = await createPreparedSession(
      user.token,
      new Date('2026-05-03T10:00:00.000Z'),
      (state) => prepareCompletedState(state, true),
    );
    addDevelopmentCounts(expectedCounts, countDevelopments(winningSession.state));

    const losingSession = await createPreparedSession(
      user.token,
      new Date('2026-05-02T10:00:00.000Z'),
      (state) => prepareCompletedState(state, false),
    );
    addDevelopmentCounts(expectedCounts, countDevelopments(losingSession.state));

    const inProgressSession = await createPreparedSession(
      user.token,
      new Date('2026-05-01T10:00:00.000Z'),
      (state) => {
        prepareInProgressState(state, 4);
        placeDevelopment(state, 1, 1, 'PATH');
        placeDevelopment(state, 1, 2, 'WATER');
        placeDevelopment(state, 1, 3, 'BENCH');

        return GameSessionStatus.IN_PROGRESS;
      },
    );
    addDevelopmentCounts(
      expectedCounts,
      countDevelopments(inProgressSession.state),
    );

    const response = await request(app.getHttpServer())
      .get('/game-sessions')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    let wins = 0;
    let losses = 0;
    let scoreTotal = 0;
    let scoredGames = 0;
    const receivedCounts = createEmptyDevelopmentCounts();

    response.body.forEach((session: { status: string; state: GameState }) => {
      if (session.status === 'COMPLETED' && session.state.score) {
        scoredGames += 1;
        scoreTotal += session.state.score.total;

        if (session.state.score.victoryAchieved) {
          wins += 1;
        } else {
          losses += 1;
        }
      }

      addDevelopmentCounts(receivedCounts, countDevelopments(session.state));
    });

    expect(response.body).toHaveLength(3);
    expect(scoredGames).toBe(2);
    expect(wins).toBe(1);
    expect(losses).toBe(1);
    expect(scoreTotal).toBeGreaterThan(0);
    expect(receivedCounts).toEqual(expectedCounts);
  });
});
