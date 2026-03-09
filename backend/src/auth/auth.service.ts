/*
https://docs.nestjs.com/security/authentication
https://docs.nestjs.com/recipes/passport
https://www.typescriptlang.org/docs/handbook/2/classes.html
https://github.com/nestjs/jwt/blob/master/README.md
*/

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UsersService } from '../users/users.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingEmail = await this.usersService.findByEmail(registerDto.email)

    if (existingEmail) {
      throw new BadRequestException('Ya existe un usuario con ese email')
    }

    const existingUsername = await this.usersService.findByUsername(
      registerDto.username,
    )

    if (existingUsername) {
      throw new BadRequestException('Ya existe un usuario con ese username')
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10)

    const user = await this.usersService.create({
      email: registerDto.email,
      username: registerDto.username,
      passwordHash,
    })

    return {
      message: 'Usuario registrado correctamente',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email)

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas')
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    )

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas')
    }

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    }

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    }
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId)
  }
}
