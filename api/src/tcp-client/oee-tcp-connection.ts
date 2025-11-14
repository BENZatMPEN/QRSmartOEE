import * as net from 'net';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Oee } from '../oee/entities/oee.entity'; // (ต้อง import Oee entity ของคุณ)

export class OeeTcpConnection {
  private readonly logger: Logger;
  private client: net.Socket;
  private buffer = '';
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isDestroyed = false; // Flag เพื่อป้องกันการ reconnect

  constructor(
    private readonly oeeConfig: Oee, // รับ Config OEE มา
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger = new Logger(`OeeTcpConnection[${oeeConfig.masterOeeId}]`);
  }

  public connect() {
    // (ดึง IP/Port จาก Config ที่รับมา)
    const host = this.oeeConfig.tcpIp;
    const port = this.oeeConfig.port;

    if (!host || !port) {
      this.logger.warn(`Missing TCP/IP config. Connection skipped.`);
      return;
    }

    this.logger.log(`Connecting to TCP Server at ${host}:${port}...`);
    this.isDestroyed = false;
    this.client = new net.Socket();

    this.client.connect(port, host, () => {
      this.logger.log('✅ TCP Client connected successfully!');
      this.startHeartbeat();
    });

    this.client.on('data', (data) => {
      this.logger.debug(`📩 Raw data received: ${data.toString('hex')}`);
      this.handleData(data);
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ TCP Connection Error:', err.message);
      this.stopHeartbeat();
    });

    this.client.on('close', () => {
      this.logger.warn('⚠️ TCP Connection closed.');
      this.stopHeartbeat();
      if (!this.isDestroyed) {
        // Reconnect ถ้าไม่ได้สั่งปิดเอง
        this.logger.log('Reconnecting in 5s...');
        setTimeout(() => this.connect(), 5000);
      }
    });
  }

  // ปิดการเชื่อมต่อถาวร
  public destroy() {
    this.logger.log('🛑 Stopping connection...');
    this.isDestroyed = true;
    this.stopHeartbeat();
    if (this.client) {
      this.client.destroy();
    }
  }

  // --- (ฟังก์ชัน Heartbeat เหมือนเดิม) ---
  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      const heartbeatMessage = 'PING\r\n';
      if (this.client && !this.client.destroyed) {
        this.client.write(heartbeatMessage);
        // this.logger.log('❤️ Heartbeat sent');
      }
    }, 2000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.logger.log('💔 Heartbeat stopped');
    }
  }

  // --- (HandleData ที่อัปเดตแล้ว) ---
  private handleData(data: Buffer) {
    this.buffer += data.toString('utf8');
    let crlfIndex;
    while ((crlfIndex = this.buffer.indexOf('\r\n')) !== -1) {
      const completeMessage = this.buffer.substring(0, crlfIndex);
      this.buffer = this.buffer.substring(crlfIndex + 2);

      if (completeMessage) {
        if (completeMessage.trim().toUpperCase() === 'PONG') {
          this.logger.log('❤️ Heartbeat response (PONG) received.');
          return;
        }

        this.logger.log(`📦 Received Barcode: ${completeMessage}`);

        this.eventEmitter.emit('barcode.scanned', {
          siteId: this.oeeConfig.siteId,
          oeeId: this.oeeConfig.id,
          masterOeeId: this.oeeConfig.masterOeeId,
          text: completeMessage,
          mode: 'TCP',
        });
      }
    }
  }
}
