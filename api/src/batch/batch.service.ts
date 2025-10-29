import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StartBatchDto } from './dto/start-batch.dto';
import * as Modbus from 'jsmodbus';
import net from 'net';
import { Oee } from '../oee/entities/oee.entity';
import { QrProduct } from '../oee/entities/qr-product.entity';
import { ConfigService } from '@nestjs/config'; // ✨ 1. Import ConfigService

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  constructor(
    @InjectRepository(Oee)
    private readonly oeeRepository: Repository<Oee>,
    @InjectRepository(QrProduct)
    private readonly qrProductRepository: Repository<QrProduct>,
    private readonly configService: ConfigService, // ✨ 2. Inject ConfigService
  ) {}

  async startBatchAndWriteToModbus(dto: StartBatchDto): Promise<any> {
    this.logger.log(
      `Finding product for productId: ${dto.productId}, oeeId: ${dto.oeeId}`,
    );
    const product = await this.qrProductRepository.findOne({
      // ใช้ oeeId ที่ส่งมาจาก DTO โดยตรงในการ query
      where: { productId: dto.productId.toString(), oeeId: dto.oeeId },
      relations: ['oee'], // Eager load the related Oee entity
    });

    this.logger.debug('Retrieved product:', product); // Use debug for detailed logs

    if (!product) {
      throw new NotFoundException(
        `QrProduct with productId ${dto.productId} and oeeId ${dto.oeeId} not found.`,
      );
    }
    if (!product.oee) {
      throw new Error(
        `Associated Oee entity not found for QrProduct ID ${product.id}. Check relations.`,
      );
    }
    if (isNaN(parseFloat(product.specialFactor as any))) {
      throw new Error(
        `Product with ID ${dto.productId} has an invalid specialFactor (${product.specialFactor}).`,
      );
    }

    const specialFactorFloat = parseFloat(product.specialFactor as any);
    this.logger.log(`Found specialFactor: ${specialFactorFloat}`);

    try {
      // ✨ 3. ส่ง oee object เข้าไปในฟังก์ชัน
      await this.writeFloatToModbus(specialFactorFloat, product.oee);

      this.logger.log('Successfully wrote specialFactor to Modbus server.');
      return {
        success: true,
        message: 'Batch started and value sent to Modbus.',
      };
    } catch (error) {
      this.logger.error('Failed to write to Modbus server', error.stack);
      throw new Error('Failed to communicate with Modbus server.');
    }
  }

  /**
   * Writes a float value to a specific Modbus address defined in the Oee entity.
   * @param value The float value to write.
   * @param oee The Oee entity containing Modbus configuration.
   */
  private writeFloatToModbus(value: number, oee: Oee): Promise<void> {
    return new Promise((resolve, reject) => {
      // ✨ 4. ดึงค่า Config จาก ConfigService และ Entity
      const modbusServerIp = this.configService.get<string>('MODBUS_IP');
      const modbusPort = this.configService.get<number>('MODBUS_PORT');
      const registerAddressString = oee.modbusAddress; // Address จาก Entity (เป็น string)
      const unitId = 1; // Or read from config/entity if needed
      console.log(
        `Modbus Config - IP: ${modbusServerIp}, Port: ${modbusPort}, Address: ${registerAddressString}`,
      );
      if (!modbusServerIp || !modbusPort) {
        return reject(
          new Error('MODBUS_IP or MODBUS_PORT not defined in configuration.'),
        );
      }
      if (!registerAddressString) {
        return reject(
          new Error(`Modbus address not defined for OEE ID ${oee.id}.`),
        );
      }

      // ✨ 5. แปลง Address เป็นตัวเลข
      const registerAddress = parseInt(registerAddressString, 10);
      if (isNaN(registerAddress)) {
        return reject(
          new Error(
            `Invalid Modbus address format "${registerAddressString}" for OEE ID ${oee.id}.`,
          ),
        );
      }

      this.logger.log(
        `[Modbus] Attempting connection to ${modbusServerIp}:${modbusPort} (Unit: ${unitId})`,
      );

      const socket = new net.Socket();
      const client = new Modbus.client.TCP(socket, unitId);

      socket.on('connect', () => {
        this.logger.log('[Modbus] ✅ TCP Socket connected successfully.');

        const buffer = Buffer.alloc(4);
        buffer.writeFloatBE(value); // Consider LE if needed: buffer.writeFloatLE(value);

        this.logger.log(
          `[Modbus] Preparing to write value: ${value} (Buffer: <${buffer.toString('hex')}>) to Register: ${registerAddress}`,
        );

        client
          .writeMultipleRegisters(registerAddress, buffer)
          .then((response) => {
            this.logger.log(
              '[Modbus] ✅ Write successful. Response:',
              response,
            );
            socket.end();
            // Resolve is implicitly handled by socket.on('close') now
          })
          .catch((err) => {
            this.logger.error('[Modbus] ❌ Write Error:', err);
            socket.end();
            reject(err);
          });
      });

      socket.on('error', (err) => {
        this.logger.error(
          '[Modbus] ❌ TCP Socket Connection Error:',
          err.message,
        );
        reject(err); // Reject promise on connection error
      });

      socket.on('close', (hadError) => {
        if (!hadError) {
          this.logger.log('[Modbus] 🔌 TCP Socket connection closed normally.');
          resolve(); // Resolve promise only if closed without prior error
        } else {
          this.logger.warn('[Modbus] 🔌 TCP Socket closed due to an error.');
          // Do not resolve here if closed due to an error, reject was already called
        }
      });

      this.logger.log('[Modbus] Initializing connection...');
      socket.connect({ host: modbusServerIp, port: modbusPort });
    });
  }
}
