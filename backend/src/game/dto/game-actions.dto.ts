import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import {
  DEVELOPMENT_TYPES,
  GAME_DICE,
  type DevelopmentType,
  type DiceType,
} from '../game-state';

const DICE_TYPES = GAME_DICE.map((dice) => dice.type);

export class UnlockDevelopmentDto {
  @IsIn(DEVELOPMENT_TYPES)
  developmentType!: DevelopmentType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(DICE_TYPES, { each: true })
  diceTypes!: DiceType[];
}

export class PlaceDevelopmentDto extends UnlockDevelopmentDto {
  @IsInt()
  @Min(1)
  @Max(9)
  row!: number;

  @IsInt()
  @Min(1)
  @Max(9)
  column!: number;
}

export class ModifyDiceDto {
  @IsIn(DICE_TYPES)
  diceType!: DiceType;

  @IsInt()
  @IsIn([-1, 1])
  delta!: -1 | 1;
}
