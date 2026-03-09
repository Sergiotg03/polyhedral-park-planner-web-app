/*
https://github.com/nestjs/docs.nestjs.com/blob/master/content/guards.md
https://docs.nestjs.com/recipes/passport
*/

import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
