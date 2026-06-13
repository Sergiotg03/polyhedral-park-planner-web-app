/*
https://docs.nestjs.com/techniques/validation
https://docs.nestjs.com/pipes
*/

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const corsOrigins = ['http://localhost:5173']

  if (process.env.FRONTEND_URL) {
    corsOrigins.push(process.env.FRONTEND_URL)
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
