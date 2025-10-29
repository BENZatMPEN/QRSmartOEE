import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TcpClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TcpClientService.name);
  private client: net.Socket;
  private buffer = '';

  // ✨ 1. เพิ่มตัวแปรสำหรับเก็บ Interval ID
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.connect();
  }

  // ✨ 2. เพิ่ม Lifecycle Hook สำหรับตอนปิดแอป
  onModuleDestroy() {
    this.logger.log('🛑 Stopping TCP client...');
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.client.destroy(); // ปิดการเชื่อมต่อทันที
  }

  connect() {
    const host =
      this.configService.get<string>('TCP_SERVER_HOST') || '127.0.0.1';
    const port = this.configService.get<number>('TCP_SERVER_PORT') || 5001;

    this.logger.log(`Connecting to TCP Server at ${host}:${port}...`);

    this.client = new net.Socket();

    this.client.connect(port, host, () => {
      this.logger.log('✅ TCP Client connected successfully!');

      // ✨ 3. เริ่มส่ง Heartbeat หลังจากเชื่อมต่อสำเร็จ
      this.startHeartbeat();
    });

    this.client.on('data', (data) => {
      this.logger.debug(`📩 Raw data received: ${data.toString('hex')}`);
      this.handleData(data);
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ TCP Connection Error:', err.message);
      this.stopHeartbeat(); // หยุดส่งเมื่อเกิด error
    });

    this.client.on('close', () => {
      this.logger.warn('⚠️ TCP Connection closed. Reconnecting in 5s...');
      this.stopHeartbeat(); // ✨ 4. หยุดส่ง Heartbeat เมื่อการเชื่อมต่อถูกปิด
      setTimeout(() => this.connect(), 5000);
    });
  }

  // ✨ 5. สร้างฟังก์ชันสำหรับเริ่มและหยุด Heartbeat
  private startHeartbeat() {
    // ป้องกันการสร้าง interval ซ้ำซ้อน
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      // ข้อมูลที่จะส่ง (อาจจะเป็นข้อความเฉพาะ หรือแค่ CR+LF เพื่อ keep-alive)
      const heartbeatMessage = 'PING\r\n';
      if (this.client && !this.client.destroyed) {
        this.client.write(heartbeatMessage);
        // this.logger.log('❤️ Heartbeat sent');
      }
    }, 2000); // 2000 milliseconds = 2 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.logger.log('💔 Heartbeat stopped');
    }
  }

  private handleData(data: Buffer) {
    this.logger.debug(`🧩 Buffer before: "${this.buffer}"`);
    this.logger.debug(`🧩 Incoming chunk: "${data.toString('utf8')}"`);

    this.buffer += data.toString('utf8');

    let crlfIndex;
    while ((crlfIndex = this.buffer.indexOf('\r\n')) !== -1) {
      const completeMessage = this.buffer.substring(0, crlfIndex);
      this.buffer = this.buffer.substring(crlfIndex + 2);

      this.logger.debug(`✅ Complete message: "${completeMessage}"`);
      this.logger.debug(`🪣 Buffer remaining: "${this.buffer}"`);

      if (completeMessage) {
        // ป้องกันไม่ให้ประมวลผลข้อความ PONG ที่อาจจะตอบกลับมา
        if (completeMessage.trim().toUpperCase() === 'PONG') {
          this.logger.log('❤️ Heartbeat response (PONG) received.');
          return; // ไม่ต้อง emit event
        }

        this.logger.log(`📦 Received Barcode: ${completeMessage}`);
        this.eventEmitter.emit('barcode.scanned', { text: completeMessage });
      }
    }
  }
}
