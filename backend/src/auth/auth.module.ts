/*
https://docs.nestjs.com/security/authentication
https://docs.nestjs.com/recipes/passport
https://docs.nestjs.com/fundamentals/dynamic-modules
*/

import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error('Se requiere un JWT_SECRET')
}

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
