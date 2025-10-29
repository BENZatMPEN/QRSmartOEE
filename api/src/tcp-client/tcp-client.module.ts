import { Module } from '@nestjs/common';
import { TcpClientService } from './tcp-client.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule], // <-- เพิ่มที่นี่
  providers: [TcpClientService],
  exports: [TcpClientService], // Export ไว้เผื่อ Service อื่นอยากเรียกใช้โดยตรง
})
export class TcpClientModule {}
