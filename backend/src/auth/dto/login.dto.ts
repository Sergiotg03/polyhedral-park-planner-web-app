/*
https://docs.nestjs.com/techniques/validation
https://github.com/typestack/class-validator?tab=readme-ov-file#validation-decorators
*/

import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}
