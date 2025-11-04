import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Oee } from '../oee/entities/oee.entity'; // (ต้อง import Oee entity)
import { OeeTcpConnection } from './oee-tcp-connection';

@Injectable()
export class TcpClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TcpClientService.name);

  // Map สำหรับเก็บการเชื่อมต่อทั้งหมด (Key คือ oeeId, Value คือ instance)
  private connections = new Map<number, OeeTcpConnection>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Oee)
    private readonly oeeRepository: Repository<Oee>, // Inject Repo เพื่ออ่าน Config
  ) {}

  // เมื่อ Module เริ่มทำงาน
  async onModuleInit() {
    this.logger.log('🚀 Initializing TCP Connection Manager...');
    await this.loadAllOeeConnections();
  }

  // เมื่อ Module ถูกทำลาย (แอปปิด)
  onModuleDestroy() {
    this.logger.log('🛑 Shutting down all TCP connections...');
    this.connections.forEach((connection) => {
      connection.destroy();
    });
  }

  // โหลด Config จาก DB และสร้างการเชื่อมต่อ
  private async loadAllOeeConnections() {
    // 1. ค้นหา OEE ทั้งหมดที่มี Config TCP/IP
    const oeesWithTcp = await this.oeeRepository.find({
      where: {
        tcpIp: Not(IsNull()),
        port: Not(IsNull()),
      },
    });

    this.logger.log(`Found ${oeesWithTcp.length} OEE(s) with TCP config.`);

    // 2. วนลูปสร้างการเชื่อมต่อ
    for (const oee of oeesWithTcp) {
      this.createConnection(oee);
    }
  }

  // (ฟังก์ชันนี้สามารถเรียกใช้จาก Service อื่นได้ เช่น เมื่อมีการอัปเดต Oee)
  public createConnection(oee: Oee) {
    // ✨ FIX: 1. ดึง connection มาเก็บในตัวแปร
    const existingConnection = this.connections.get(oee.id);

    // ✨ FIX: 2. ตรวจสอบว่า connection มีอยู่จริงหรือไม่ก่อนเรียกใช้
    if (existingConnection) {
      this.logger.log(
        `Re-initializing connection for OEE ID: ${oee.masterOeeId}`,
      );
      existingConnection.destroy();
    }

    // สร้าง Instance ใหม่
    const connection = new OeeTcpConnection(oee, this.eventEmitter);
    connection.connect();

    // เก็บ Instance ไว้ใน Map
    this.connections.set(oee.id, connection);
  }

  // (ฟังก์ชันนี้สามารถเรียกใช้จาก Service อื่นได้ เช่น เมื่อมีการลบ Oee)
  public removeConnection(oeeId: number) {
    // ✨ FIX: 1. ดึง connection มาเก็บในตัวแปร
    const connection = this.connections.get(oeeId);

    // ✨ FIX: 2. ตรวจสอบว่า connection มีอยู่จริงหรือไม่ก่อนเรียกใช้
    if (connection) {
      this.logger.log(`Removing connection for OEE ID: ${oeeId}`);
      connection.destroy();
      this.connections.delete(oeeId);
    }
  }
}
