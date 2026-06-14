import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS: permite cualquier origen (incluye IPs, dominios Dokploy, etc.)
  app.enableCors({
    origin: true,          // equivale a Access-Control-Allow-Origin: *
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Backend AllRide corriendo en puerto ${port}`);
}
bootstrap();
