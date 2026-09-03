import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {ValidationPipe} from '@nestjs/common'
import helmet from 'helmet';
import compression from 'compression'
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet())
  app.use(compression())

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  )
  await app.listen(process.env.PORT ?? 3000);

  app.enableCors()

  console.log(`Server running on http://localhost:${process.env.PORT ?? 3000}/api/v1`);
}
bootstrap();
