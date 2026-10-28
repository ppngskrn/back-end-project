/*
AI Declaration:
I used claude to help come up with the description and example in task 2. Also help implement the optional task 6, the filtering.

Reflection:
I learned how to implement and initialise swagger. Also properly utilize the auto generated api documentation through swagger UI.
*/

import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import { ValidationPipe, ConsoleLogger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {config} from 'dotenv';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'nest-lab',
    }),
  });
  
  app.useGlobalPipes(new ValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hotel Booking System API')
    .setDescription(
      'REST API for managing hotel Rooms and Bookings.\n\n' +
        '**Rate limiting:** each client is limited to 100 requests per minute. ' +
        'Exceeding the limit returns `429 Too Many Requests`.\n\n' +
        'Protected endpoints require a JWT. Log in via `POST /auth/login`, ' +
        'then click **Authorize** and paste the access token.',
    )
    .setVersion('1.0.0')
    .addTag('rooms', 'Room management')
    .addTag('bookings', 'Booking management')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token', 
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);
 
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
