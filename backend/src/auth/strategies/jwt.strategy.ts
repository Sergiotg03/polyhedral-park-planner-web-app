/*
https://docs.nestjs.com/recipes/passport
https://docs.nestjs.com/security/authentication
*/

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { AuthService } from '../auth.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('Se requiere un JWT_SECRET')
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    })
  }

  async validate(payload: { sub: string }) {
    const user = await this.authService.validateUser(payload.sub)

    if (!user) {
      throw new UnauthorizedException()
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
    }
  }
}
