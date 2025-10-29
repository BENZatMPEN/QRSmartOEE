import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // 👈 1. Import เข้ามา

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 👇 2. เพิ่มบรรทัดนี้เพื่อเปิดใช้งาน Validation ทั่วทั้งแอป
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ลบ property ที่ไม่มีใน DTO ทิ้งไปโดยอัตโนมัติ
      forbidNonWhitelisted: true, // ส่ง error ถ้ามี property ที่ไม่มีใน DTO ส่งเข้ามา
      transform: true, // แปลงข้อมูลให้ตรงกับ type ที่ระบุใน DTO (เช่น string -> number)
    }),
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
