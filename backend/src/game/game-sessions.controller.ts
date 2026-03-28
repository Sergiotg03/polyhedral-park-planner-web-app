/*
https://docs.nestjs.com/controllers
https://docs.nestjs.com/guards
*/

import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GameSessionsService } from './game-sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// request cuando jwt ya ha metido el usuario autenticado
type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
    username: string;
  };
};

@Controller('game-sessions')
@UseGuards(JwtAuthGuard)
export class GameSessionsController {
  constructor(private readonly gameSessionsService: GameSessionsService) {}

  // crea una partida nueva para el usuario conectado
  @Post()
  create(@Req() req: AuthenticatedRequest) {
    return this.gameSessionsService.create(req.user.id);
  }

  // lista las partidas del usuario conectado
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.gameSessionsService.findAllForUser(req.user.id);
  }

  // carga una partida concreta solo si pertenece al usuario
  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.gameSessionsService.findOneForUser(req.user.id, id);
  }
}
