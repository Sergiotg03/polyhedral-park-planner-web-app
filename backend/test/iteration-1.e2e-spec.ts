/// <reference types="@types/jest" />

import { INestApplication } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppController } from './../src/app.controller'
import { AppService } from './../src/app.service'
import { AuthController } from './../src/auth/auth.controller'
import { AuthService } from './../src/auth/auth.service'
import { JwtStrategy } from './../src/auth/strategies/jwt.strategy'
import { UsersService } from './../src/users/users.service'

type TestUser = {
  id: string
  email: string
  username: string
  passwordHash: string
}

const TEST_JWT_SECRET = 'test-secret'

describe('Iteracion 1 auth flow (e2e)', () => {
  let app: INestApplication<App>
  let users: TestUser[]
  let nextUserId: number

  const usersServiceMock = {
    findById: jest.fn((id: string) => {
      return Promise.resolve(users.find((user) => user.id === id) ?? null)
    }),
    findByEmail: jest.fn((email: string) => {
      return Promise.resolve(users.find((user) => user.email === email) ?? null)
    }),
    findByUsername: jest.fn((username: string) => {
      return Promise.resolve(
        users.find((user) => user.username === username) ?? null,
      )
    }),
    create: jest.fn(
      (data: {
        email: string
        username: string
        passwordHash: string
      }) => {
        const user = {
          id: `user-${nextUserId++}`,
          ...data,
        }
        users.push(user)
        return Promise.resolve(user)
      },
    ),
  }

  const seedUser = async (
    email = 'usuario@test.com',
    username = 'usuario_existente',
    password = '123456',
  ) => {
    users.push({
      id: `user-${nextUserId++}`,
      email,
      username,
      passwordHash: await bcrypt.hash(password, 10),
    })
  }

  beforeEach(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET
    users = []
    nextUserId = 1
    jest.clearAllMocks()

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '7d' },
        }),
      ],
      controllers: [AppController, AuthController],
      providers: [
        AppService,
        AuthService,
        JwtStrategy,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('GET / returns backend status information', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({
        name: 'Polyhedral Park Planner Web App Backend',
        status: 'OK',
      })
  })

  it('P-01 rejects registration when email already exists', async () => {
    await seedUser('usuario@test.com', 'usuario_existente')

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'usuario@test.com',
        username: 'usuario_nuevo',
        password: '123456',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Ya existe un usuario con ese email')
      })
  })

  it('P-02 registers a user with valid data', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'nuevo@test.com',
        username: 'usuarionuevo',
        password: '123456',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          message: 'Usuario registrado correctamente',
          user: {
            id: expect.any(String),
            email: 'nuevo@test.com',
            username: 'usuarionuevo',
          },
        })
      })
  })

  it('P-03 rejects login with incorrect password', async () => {
    await seedUser('nuevo@test.com', 'usuarionuevo', '123456')

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'nuevo@test.com',
        password: 'passwordMAL',
      })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Credenciales incorrectas')
      })
  })

  it('P-04 logs in with valid credentials', async () => {
    await seedUser('nuevo@test.com', 'usuarionuevo', '123456')

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'nuevo@test.com',
        password: '123456',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.access_token).toEqual(expect.any(String))
        expect(body.user).toEqual({
          id: expect.any(String),
          email: 'nuevo@test.com',
          username: 'usuarionuevo',
        })
      })
  })

  it('P-05 rejects authenticated endpoint without token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401)
  })

  it('P-06 returns current user with valid token', async () => {
    await seedUser('nuevo@test.com', 'usuarionuevo', '123456')

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'nuevo@test.com',
        password: '123456',
      })
      .expect(200)

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          id: expect.any(String),
          email: 'nuevo@test.com',
          username: 'usuarionuevo',
        })
      })
  })

  it('P-07 rejects authenticated endpoint with invalid token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer tokeninvalidoquenoesunjwt')
      .expect(401)
  })
})
