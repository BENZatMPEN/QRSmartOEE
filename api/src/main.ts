import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // ✅ เปิด CORS สำหรับทุก origin
  app.enableCors({
    origin: '*', // หรือจะระบุเฉพาะ http://localhost:4000 ก็ได้
    methods: ['GET', 'POST'],
    credentials: true,
  });

  // ✅ Validation pipe เดิม
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 8000);
  console.log(`🚀 Server running on port ${process.env.PORT || 8000}`);
}
bootstrap();
