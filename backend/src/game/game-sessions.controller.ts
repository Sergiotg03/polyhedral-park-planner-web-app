/*
https://docs.nestjs.com/controllers
https://docs.nestjs.com/guards
*/

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { GameSessionsService } from './game-sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ModifyDiceDto,
  PlaceDevelopmentDto,
  RerollDiceDto,
  UnlockDevelopmentDto,
} from './dto/game-actions.dto';

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

  // lista las partidas del usuario para el historial del home
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.gameSessionsService.findAllForUser(req.user.id);
  }

  // carga una partida concreta solo si pertenece al usuario
  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.gameSessionsService.findOneForUser(req.user.id, id);
  }

  // registra la tirada de dados de la ronda actual
  @Post(':id/roll-dice')
  rollDice(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.gameSessionsService.rollDice(req.user.id, id);
  }

  // modifica un dado de la ronda y suma la penalizacion
  @Post(':id/modify-dice')
  modifyDice(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() modifyDiceDto: ModifyDiceDto,
  ) {
    return this.gameSessionsService.modifyDice(req.user.id, id, modifyDiceDto);
  }

  // relanza uno o varios dados y suma penalizaciones
  @Post(':id/reroll-dice')
  rerollDice(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() rerollDiceDto: RerollDiceDto,
  ) {
    return this.gameSessionsService.rerollDice(req.user.id, id, rerollDiceDto);
  }

  // desbloquea uno de los elementos con los dados seleccionados
  @Post(':id/unlock-development')
  unlockDevelopment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() unlockDevelopmentDto: UnlockDevelopmentDto,
  ) {
    return this.gameSessionsService.unlockDevelopment(
      req.user.id,
      id,
      unlockDevelopmentDto,
    );
  }

  // coloca un elemento ya desbloqueado en el tablero
  @Post(':id/place-development')
  placeDevelopment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() placeDevelopmentDto: PlaceDevelopmentDto,
  ) {
    return this.gameSessionsService.placeDevelopment(
      req.user.id,
      id,
      placeDevelopmentDto,
    );
  }

  // termina la ronda cuando ya no quedan jugadas validas
  @Post(':id/advance-round')
  advanceRound(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.gameSessionsService.advanceRound(req.user.id, id);
  }
}
