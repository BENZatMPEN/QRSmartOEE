// src/qr-updates/qr-updates.module.ts
import { Module } from '@nestjs/common';
import { QrUpdatesGateway } from './qr-updates.gateway';

@Module({
  providers: [QrUpdatesGateway],
  exports: [QrUpdatesGateway], // Export ไว้ให้ Service อื่นเรียกใช้
})
export class QrUpdatesModule {}
