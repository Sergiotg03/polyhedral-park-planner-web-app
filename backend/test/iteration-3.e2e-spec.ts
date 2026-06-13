import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
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

const TEST_EMAIL_DOMAIN = '@iteration3.test';

jest.setTimeout(30000);

describe('Iteracion 3', () => {
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

  function buildUsedDice() {
    return GAME_DICE.map((diceItem) => ({
      type: diceItem.type,
      sides: diceItem.sides,
      value: 1,
      used: true,
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

  function getScoringCard(id: string): ScoringCardState {
    const card = SCORING_CARDS.find((scoringCard) => scoringCard.id === id);

    if (!card) {
      throw new Error(`No existe la carta ${id}`);
    }

    return card;
  }

  function prepareFinalRound(state: GameState) {
    state.status = 'IN_PROGRESS';
    state.currentRound = 10;
    state.score = null;

    state.rounds.forEach((round) => {
      round.completed = round.roundNumber < 10;
      round.dice = round.roundNumber === 10 ? buildUsedDice() : round.dice;
    });
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

  it('P3-01 crea una partida con tres cartas de puntuación', async () => {
    const user = await createTestUser('it3cards');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;
    const cardIds = state.scoringCards.map((card) => card.id);

    expect(state.scoringCards).toHaveLength(3);
    expect(new Set(cardIds).size).toBe(3);
    expect(state.scoringCards[0].soloTarget).toEqual(expect.any(Number));
    expect(state.score).toBeNull();
  });

  it('P3-02 calcula la puntuación final al terminar la ronda 10', async () => {
    const user = await createTestUser('it3score');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;

    prepareFinalRound(state);
    cleanBoard(state);

    state.penalties.diceModifications = 2;
    state.scoringCards = [
      getScoringCard('04-los-mejores-asientos-de-la-casa'),
      getScoringCard('07-un-lugar-sombreado-para-descansar'),
      getScoringCard('06-puentes-sobre-aguas-turbulentas'),
    ];

    placeDevelopment(state, 5, 6, 'BENCH');
    placeDevelopment(state, 4, 6, 'TREE');
    placeDevelopment(state, 6, 6, 'TREE');
    placeDevelopment(state, 7, 6, 'PATH');
    placeDevelopment(state, 7, 5, 'WATER');
    placeDevelopment(state, 7, 7, 'WATER');

    await updateSessionState(gameSession.id, state);

    const response = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/advance-round`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(201);

    const score = (response.body.state as GameState).score;

    expect(response.body.status).toBe('COMPLETED');
    expect(score).not.toBeNull();
    expect(score?.cards).toEqual([
      expect.objectContaining({
        cardId: '04-los-mejores-asientos-de-la-casa',
        points: 1,
      }),
      expect.objectContaining({
        cardId: '07-un-lugar-sombreado-para-descansar',
        points: 2,
      }),
      expect.objectContaining({
        cardId: '06-puentes-sobre-aguas-turbulentas',
        points: 3,
      }),
    ]);
    expect(score?.penalties.diceModifications).toBe(2);
    expect(score?.penalties.isolatedRegionCount).toBe(0);
    expect(score?.total).toBe(4);
    expect(score?.soloTarget).toBe(45);
    expect(score?.victoryAchieved).toBe(false);
  });

  it('P3-03 penaliza regiones que no estan cerca del puesto de informacion', async () => {
    const user = await createTestUser('it3isolated');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;

    prepareFinalRound(state);
    cleanBoard(state);

    state.scoringCards = [
      getScoringCard('04-los-mejores-asientos-de-la-casa'),
      getScoringCard('07-un-lugar-sombreado-para-descansar'),
      getScoringCard('06-puentes-sobre-aguas-turbulentas'),
    ];

    placeDevelopment(state, 1, 1, 'BENCH');

    await updateSessionState(gameSession.id, state);

    const response = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/advance-round`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(201);

    const score = (response.body.state as GameState).score;
    const benchCard = score?.cards.find(
      (card) => card.cardId === '04-los-mejores-asientos-de-la-casa',
    );

    expect(benchCard?.points).toBe(0);
    expect(score?.penalties.isolatedRegionCount).toBe(1);
    expect(score?.penalties.isolatedRegions).toBe(3);
    expect(score?.total).toBe(-3);
  });

  it('P3-04 diferencia la puntuación y el requisito de la carta De pesca', async () => {
    const user = await createTestUser('it3fishing');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;

    prepareFinalRound(state);
    cleanBoard(state);

    state.scoringCards = [
      getScoringCard('08-de-pesca'),
      getScoringCard('04-los-mejores-asientos-de-la-casa'),
      getScoringCard('07-un-lugar-sombreado-para-descansar'),
    ];

    placeDevelopment(state, 4, 4, 'BENCH');
    placeDevelopment(state, 3, 3, 'WATER');
    placeDevelopment(state, 3, 4, 'WATER');
    placeDevelopment(state, 3, 5, 'WATER');
    placeDevelopment(state, 4, 3, 'WATER');

    placeDevelopment(state, 6, 6, 'BENCH');
    placeDevelopment(state, 7, 6, 'WATER');
    placeDevelopment(state, 6, 7, 'WATER');

    await updateSessionState(gameSession.id, state);

    const response = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/advance-round`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(201);

    const score = (response.body.state as GameState).score;
    const fishingCard = score?.cards.find(
      (card) => card.cardId === '08-de-pesca',
    );
    const fishingRequirement = score?.victoryRequirements.find(
      (requirement) => requirement.cardId === '08-de-pesca',
    );

    expect(fishingCard?.points).toBe(6);
    expect(fishingCard?.detail).toContain('4 + 2');
    expect(fishingRequirement?.fulfilled).toBe(false);
    expect(fishingRequirement?.detail).toBe('Mejor banco: 4 puntos');
    expect(score?.victoryAchieved).toBe(false);
  });

  it('P3-05 reconoce una victoria si se cumplen puntos y requisitos', async () => {
    const user = await createTestUser('it3victory');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;

    prepareFinalRound(state);
    cleanBoard(state);

    state.scoringCards = [
      getScoringCard('04-los-mejores-asientos-de-la-casa'),
      getScoringCard('07-un-lugar-sombreado-para-descansar'),
      getScoringCard('09-centro-de-atencion'),
    ];

    buildWinningBoard(state);

    await updateSessionState(gameSession.id, state);

    const response = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/advance-round`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(201);

    const score = (response.body.state as GameState).score;

    expect(score?.cards).toEqual([
      expect.objectContaining({
        cardId: '04-los-mejores-asientos-de-la-casa',
        points: 14,
      }),
      expect.objectContaining({
        cardId: '07-un-lugar-sombreado-para-descansar',
        points: 28,
      }),
      expect.objectContaining({
        cardId: '09-centro-de-atencion',
        points: 32,
      }),
    ]);
    expect(score?.soloTarget).toBe(46);
    expect(score?.total).toBe(74);
    expect(score?.soloTargetReached).toBe(true);
    expect(
      score?.victoryRequirements.every((requirement) => requirement.fulfilled),
    ).toBe(true);
    expect(score?.victoryAchieved).toBe(true);
  });

  it('P3-06 aplica penalizacion al modificar dados y la resta al puntuar', async () => {
    const user = await createTestUser('it3modifiers');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;

    prepareFinalRound(state);
    cleanBoard(state);

    state.scoringCards = [
      getScoringCard('04-los-mejores-asientos-de-la-casa'),
      getScoringCard('07-un-lugar-sombreado-para-descansar'),
      getScoringCard('09-centro-de-atencion'),
    ];
    state.rounds[9].dice = GAME_DICE.map((dice) => ({
      type: dice.type,
      sides: dice.sides,
      value: 1,
      used: dice.type !== 'D4',
    }));

    buildWinningBoard(state);

    await updateSessionState(gameSession.id, state);

    const modifyResponse = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/modify-dice`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        diceType: 'D4',
        delta: 1,
      })
      .expect(201);

    const modifiedState = modifyResponse.body.state as GameState;
    const d4 = modifiedState.rounds[9].dice?.find(
      (dice) => dice.type === 'D4',
    );

    expect(d4?.value).toBe(2);
    expect(modifiedState.penalties.diceModifications).toBe(1);

    await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/unlock-development`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        developmentType: 'TREE',
        diceTypes: ['D4'],
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/advance-round`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(201);

    const score = (response.body.state as GameState).score;

    expect(score?.penalties.diceModifications).toBe(1);
    expect(score?.total).toBe(73);
    expect(score?.victoryAchieved).toBe(true);
  });

  it('P3-07 aplica penalizacion al relanzar dados', async () => {
    const user = await createTestUser('it3reroll');
    const gameSession = await createGameSession(user.token);
    const state = gameSession.state as GameState;

    state.rounds[0].dice = GAME_DICE.map((dice) => ({
      type: dice.type,
      sides: dice.sides,
      value: 1,
      used: dice.type !== 'D4' && dice.type !== 'D6',
    }));

    await updateSessionState(gameSession.id, state);

    const response = await request(app.getHttpServer())
      .post(`/game-sessions/${gameSession.id}/reroll-dice`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        diceTypes: ['D4', 'D6'],
      })
      .expect(201);

    const updatedState = response.body.state as GameState;
    const currentDice = updatedState.rounds[0].dice;
    const d4 = currentDice?.find((dice) => dice.type === 'D4');
    const d6 = currentDice?.find((dice) => dice.type === 'D6');

    expect(updatedState.penalties.diceModifications).toBe(2);
    expect(d4?.used).toBe(false);
    expect(d6?.used).toBe(false);
    expect(d4?.value).toBeGreaterThanOrEqual(1);
    expect(d4?.value).toBeLessThanOrEqual(4);
    expect(d6?.value).toBeGreaterThanOrEqual(1);
    expect(d6?.value).toBeLessThanOrEqual(6);
  });
});
