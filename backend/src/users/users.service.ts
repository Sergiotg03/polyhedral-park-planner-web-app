/* 
https://docs.nestjs.com/security/authentication
https://www.typescriptlang.org/docs/handbook/2/classes.html 
*/

import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    })
  }

  create(data: {
    email: string
    username: string
    passwordHash: string
  }) {
    return this.prisma.user.create({
      data,
    })
  }
}
