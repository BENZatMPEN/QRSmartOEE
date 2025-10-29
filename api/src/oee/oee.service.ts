import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateOeeDto } from './dto/create-oee.dto';
import { UpdateOeeDto } from './dto/update-oee.dto';
import { Oee } from './entities/oee.entity';
import { QrProduct } from './entities/qr-product.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { QrUpdatesGateway } from '../qr-updates/qr-updates.gateway';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OeeService {
  private readonly logger = new Logger(OeeService.name);

  constructor(
    @InjectRepository(Oee)
    private readonly oeeRepository: Repository<Oee>,
    @InjectRepository(QrProduct)
    private readonly qrProductRepository: Repository<QrProduct>,
    private readonly dataSource: DataSource,
    private readonly qrUpdatesGateway: QrUpdatesGateway,
    private readonly configService: ConfigService,
  ) {}
  // --- CREATE ---
  async create(createOeeDto: CreateOeeDto): Promise<Oee> {
    const { qrProducts, ...oeeData } = createOeeDto;

    if (oeeData.qrStartFormat) {
      oeeData.qrStartFormat = `${oeeData.qrStartFormat}`;
    }

    if (oeeData.qrStopFormat) {
      oeeData.qrStopFormat = `${oeeData.qrStopFormat}`;
    }

    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const oee = this.oeeRepository.create(oeeData);
      const savedOee = await transactionalEntityManager.save(oee);

      if (qrProducts && qrProducts.length > 0) {
        const qrProductEntities = qrProducts.map((p) =>
          this.qrProductRepository.create({ ...p, oee: savedOee }),
        );
        await transactionalEntityManager.save(qrProductEntities);
      }

      // ✨ FIX 2: เพิ่มการตรวจสอบ null
      const result = await transactionalEntityManager.findOne(Oee, {
        where: { id: savedOee.id },
        relations: ['qrProducts'],
      });

      if (!result) {
        throw new InternalServerErrorException(
          'Could not retrieve OEE after creation.',
        );
      }
      return result;
    });
  }

  async update(id: number, updateOeeDto: UpdateOeeDto): Promise<Oee> {
    const { qrProducts, ...oeeData } = updateOeeDto;

    if (oeeData.qrStartFormat) {
      oeeData.qrStartFormat = `${oeeData.qrStartFormat}`;
    }

    if (oeeData.qrStopFormat) {
      oeeData.qrStopFormat = `${oeeData.qrStopFormat}`;
    }

    return this.dataSource.transaction(async (manager) => {
      const oeeRepo = manager.getRepository(Oee);
      const qrProductRepo = manager.getRepository(QrProduct);

      const existingOee = await oeeRepo.findOne({
        where: { id },
        relations: ['qrProducts'],
      });

      if (!existingOee) {
        throw new NotFoundException(`OEE with ID #${id} not found`);
      }

      // 🧩 อัปเดต field หลักของ OEE
      oeeRepo.merge(existingOee, oeeData);

      if (qrProducts) {
        // ดึง id ทั้งหมดที่ส่งมา
        const incomingIds = qrProducts.filter((p) => p.id).map((p) => p.id);

        // ลบ product ที่ไม่มีใน DTO แล้ว
        const toDelete = existingOee.qrProducts.filter(
          (p) => !incomingIds.includes(p.id),
        );
        if (toDelete.length > 0) {
          await qrProductRepo.remove(toDelete);
        }

        // เตรียมรายการอัปเดต/สร้างใหม่
        const updatedQrProducts: QrProduct[] = [];

        for (const dto of qrProducts) {
          if (dto.id) {
            // อัปเดตของเดิม
            const existingQr = await qrProductRepo.findOne({
              where: { id: dto.id },
            });

            if (existingQr) {
              qrProductRepo.merge(existingQr, dto);
              existingQr.oee = existingOee;
              updatedQrProducts.push(existingQr);
            } else {
              // ถ้า id มีแต่หาไม่เจอ → สร้างใหม่
              const newQr = qrProductRepo.create({
                ...dto,
                oee: existingOee,
              });
              updatedQrProducts.push(newQr);
            }
          } else {
            // ไม่มี id → สร้างใหม่
            const newQr = qrProductRepo.create({
              ...dto,
              oee: existingOee,
            });
            updatedQrProducts.push(newQr);
          }
        }

        // save ทั้งหมด (TypeORM จะ update หรือ insert ตาม id)
        await qrProductRepo.save(updatedQrProducts);
        existingOee.qrProducts = updatedQrProducts;
      }

      const saved = await oeeRepo.save(existingOee);

      // โหลดกลับพร้อม relations เพื่อให้ response ครบ
      const updatedOee = await oeeRepo.findOne({
        where: { id: saved.id },
        relations: ['qrProducts'],
      });

      if (!updatedOee) {
        throw new NotFoundException(`Updated OEE with ID #${id} not found`);
      }

      return updatedOee;
    });
  }

  // ... (ส่วนที่เหลือของ service)
  findAll() {
    return this.oeeRepository.find({ relations: ['qrProducts'] });
  }

  // in src/oee/oee.service.ts

  async findOne(id: number): Promise<Oee> {
    // ✨ FIX: แก้ไขให้ค้นหาด้วย Primary Key 'id' แทน 'oeeId'
    // เนื่องจาก Controller ของคุณมีการแปลง param 'id' เป็นตัวเลข (+id)
    // ซึ่งตรงกับ Primary Key ของตาราง Oee
    const oee = await this.oeeRepository.findOne({
      where: { oeeId: id },
    });

    if (!oee) {
      throw new NotFoundException(`OEE with ID #${id} not found`);
    }

    // // ✨ --- START: เพิ่ม Logic การลบ Prefix --- ✨
    // // ตรวจสอบและลบ "start_" ออกจาก qrStartFormat
    // if (oee.qrStartFormat && oee.qrStartFormat.startsWith('start_')) {
    //   oee.qrStartFormat = oee.qrStartFormat.substring(6); // "start_".length คือ 6
    // }

    // // ตรวจสอบและลบ "stop_" ออกจาก qrStopFormat
    // if (oee.qrStopFormat && oee.qrStopFormat.startsWith('stop_')) {
    //   oee.qrStopFormat = oee.qrStopFormat.substring(5); // "stop_".length คือ 5
    // }
    // // ✨ --- END: เพิ่ม Logic --- ✨

    return oee;
  }

  async remove(id: number) {
    const oee = await this.findOne(id); // ใช้ findOne เพื่อเช็คว่ามีข้อมูลจริงก่อนลบ
    await this.oeeRepository.remove(oee);
    return { deleted: true, id };
  }

  // 3. สร้าง Listener สำหรับดักจับ Event จาก TCP Client

  // in src/oee/oee.service.ts

  @OnEvent('barcode.scanned')
  async handleBarcodeScannedEvent(payload: { text: string }) {
    const siteCode = this.configService.get<string>('SITE_ID') ?? '1';
    const qrText = payload.text;
    this.logger.log(`Processing new QR: ${qrText}`);

    try {
      // ✨ --- 1. ตรวจสอบ QR ประเภท START/STOP ก่อน --- ✨
      const isStartQr = qrText.toLowerCase().startsWith('start_');
      const isStopQr = qrText.toLowerCase().startsWith('stop_');

      if (isStartQr || isStopQr) {
        const type = isStartQr ? 'START' : 'STOP';
        // ค้นหา Oee ที่มี format ตรงกับ QR ที่สแกนเข้ามา
        const foundOee = await this.oeeRepository.findOne({
          where: isStartQr
            ? { qrStartFormat: qrText }
            : { qrStopFormat: qrText },
        });

        if (foundOee) {
          this.logger.log(
            `✅ ${type} QR matched for OEE ID: ${foundOee.oeeId}`,
          );
          const dataToSend = {
            status: 'FOUND',
            oeeId: foundOee.oeeId,
            siteId: foundOee.siteId,
            scannedText: qrText,
            type: type, // 'START' or 'STOP'
            productInfo: null, // ไม่มีข้อมูล Product สำหรับ QR ประเภทนี้
            timestamp: new Date().toISOString(),
          };
          // ส่งข้อมูลไปยังห้องที่ตรงกับ siteId และ oeeId
          this.qrUpdatesGateway.sendQrUpdate(
            foundOee.siteId.toString(),
            foundOee.oeeId,
            dataToSend,
          );
        } else {
          this.logger.warn(
            `⚠️ No OEE configuration found for ${type} QR: "${qrText}"`,
          );
          // กรณีไม่เจอ ก็อาจจะส่งไปห้อง admin
          const notFoundData = {
            status: 'NOT_FOUND',
            type: type,
            scannedText: qrText,
            timestamp: new Date().toISOString(),
          };
          this.qrUpdatesGateway.sendQrUpdate('admin', 0, notFoundData);
        }
        return; // จบการทำงาน
      }

      // ✨ --- 2. ตรวจสอบ QR ประเภท PD (เหมือนเดิม) --- ✨
      if (qrText.toUpperCase().startsWith('PD')) {
        this.logger.log(
          `PD code detected: "${qrText}". Treating as direct FOUND.`,
        );
        const dataToSend = {
          status: 'FOUND',
          oeeId: 0,
          siteId: parseInt(siteCode),
          scannedText: qrText,
          type: 'PD',
          productInfo: {
            productId: null,
            productName: `Lot Number: ${qrText}`,
            specialFactor: '1.0000',
          },
          timestamp: new Date().toISOString(),
        };
        this.qrUpdatesGateway.sendQrUpdate('admin', 0, dataToSend);
        return; // จบการทำงาน
      }

      // ✨ --- 3. Logic เดิมสำหรับ QR ทั่วไป (SKU) --- ✨
      const foundProduct = await this.qrProductRepository.findOne({
        where: { qrFormatSku: qrText },
        relations: ['oee'],
      });

      if (foundProduct && foundProduct.oee) {
        this.logger.log(
          `✅ SKU Match found for ${qrText}: Product ID ${foundProduct.productId}, OEE ID ${foundProduct.oee.oeeId}`,
        );
        const dataToSend = {
          status: 'FOUND',
          oeeId: foundProduct.oee.oeeId,
          siteId: foundProduct.oee.siteId,
          scannedText: qrText,
          type: 'SKU',
          productInfo: {
            productId: foundProduct.productId,
            productName: foundProduct.productName,
            specialFactor: foundProduct.specialFactor,
          },
          timestamp: new Date().toISOString(),
        };
        this.qrUpdatesGateway.sendQrUpdate(
          foundProduct.oee.siteId.toString(),
          foundProduct.oee.oeeId,
          dataToSend,
        );
      } else {
        this.logger.warn(`⚠️ No product match found for SKU: "${qrText}"`);
        const notFoundData = {
          status: 'NOT_FOUND',
          type: 'SKU',
          scannedText: qrText,
          timestamp: new Date().toISOString(),
        };
        this.qrUpdatesGateway.sendQrUpdate('admin', 0, notFoundData);
      }
    } catch (error) {
      this.logger.error(`Error processing QR text: ${qrText}`, error.stack);
    }
  }
}
