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
import {
  CsvRow,
  FailedRow,
  ImportResult,
} from '../common/interfaces/product-item.interface';
import csvParser from 'csv-parser';
import { createReadStream } from 'fs';
import { ProductDto } from './dto/import-csv.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { CreateQrProductDto } from './dto/create-qr-product.dto';
import { UpdateQrProductDto } from './dto/update-qr-product.dto';

@Injectable()
export class OeeService {
  private readonly logger = new Logger(OeeService.name);

  constructor(
    @InjectRepository(Oee)
    private readonly oeeRepository: Repository<Oee>,
    @InjectRepository(QrProduct)
    private readonly qrProductRepo: Repository<QrProduct>,
    private readonly dataSource: DataSource,
    private readonly qrUpdatesGateway: QrUpdatesGateway,
    private readonly configService: ConfigService,
  ) {}
  // --- CREATE ---
  async create(createOeeDto: CreateOeeDto): Promise<Oee> {
    const { ...oeeData } = createOeeDto;

    if (oeeData.qrStartFormat) {
      oeeData.qrStartFormat = `${oeeData.qrStartFormat}`;
    }

    if (oeeData.qrStopFormat) {
      oeeData.qrStopFormat = `${oeeData.qrStopFormat}`;
    }

    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const oee = this.oeeRepository.create(oeeData);
      const savedOee = await transactionalEntityManager.save(oee);

      const result = await transactionalEntityManager.findOne(Oee, {
        where: { id: savedOee.id },
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
    const { ...oeeData } = updateOeeDto;

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

      oeeRepo.merge(existingOee, oeeData);

      const saved = await oeeRepo.save(existingOee);

      const updatedOee = await oeeRepo.findOne({
        where: { id: saved.id },
      });

      if (!updatedOee) {
        throw new NotFoundException(`Updated OEE with ID #${id} not found`);
      }

      return updatedOee;
    });
  }

  findAll() {
    return this.oeeRepository.find({ relations: ['qrProducts'] });
  }

  async findOne(id: number): Promise<Oee> {
    const oee = await this.oeeRepository.findOne({
      where: { masterOeeId: id },
    });

    if (!oee) {
      throw new NotFoundException(`OEE with ID #${id} not found`);
    }
    return oee;
  }

  async findQrProductsByOeeId(
    oeeId: number,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginationResponse<QrProduct>> {
    const oee = await this.oeeRepository.findOneBy({ id: oeeId });
    if (!oee) {
      throw new NotFoundException(`OEE with ID #${oeeId} not found`);
    }

    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await this.qrProductRepo.findAndCount({
      where: {
        oee: { id: oeeId },
      },
      take: limit,
      skip: skip,
      order: {
        id: 'ASC',
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async createQRProduct(
    createQrProductDto: CreateQrProductDto,
  ): Promise<QrProduct> {
    const { oeeId, ...qrProductData } = createQrProductDto;

    const oee = await this.oeeRepository.findOneBy({ id: oeeId });
    if (!oee) {
      throw new NotFoundException(`OEE with ID #${oeeId} not found`);
    }

    const qrProduct = this.qrProductRepo.create({
      ...qrProductData,
      oee: oee,
      oeeId: oeeId,
    });

    return this.qrProductRepo.save(qrProduct);
  }

  async updateQRProduct(
    id: number,
    updateQrProductDto: UpdateQrProductDto,
  ): Promise<QrProduct> {
    const qrProduct = await this.qrProductRepo.preload({
      id: id,
      ...updateQrProductDto,
    });

    if (!qrProduct) {
      throw new NotFoundException(`QrProduct with ID #${id} not found`);
    }

    return this.qrProductRepo.save(qrProduct);
  }

  async deleteQRProduct(id: number) {
    const qrProduct = await this.qrProductRepo.findOneBy({ id });
    if (!qrProduct) {
      throw new NotFoundException(`QrProduct with ID #${id} not found`);
    }
    await this.qrProductRepo.remove(qrProduct);
    return { deleted: true, id };
  }

  async remove(id: number) {
    const oee = await this.findOne(id);
    await this.oeeRepository.remove(oee);
    return { deleted: true, id };
  }

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
            `✅ ${type} QR matched for OEE ID: ${foundOee.masterOeeId}`,
          );
          const dataToSend = {
            status: 'FOUND',
            oeeId: foundOee.masterOeeId,
            siteId: foundOee.siteId,
            scannedText: qrText,
            type: type, // 'START' or 'STOP'
            productInfo: null, // ไม่มีข้อมูล Product สำหรับ QR ประเภทนี้
            timestamp: new Date().toISOString(),
          };
          // ส่งข้อมูลไปยังห้องที่ตรงกับ siteId และ oeeId
          this.qrUpdatesGateway.sendQrUpdate(
            foundOee.siteId.toString(),
            foundOee.masterOeeId,
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
      const foundProduct = await this.qrProductRepo.findOne({
        where: { qrFormatSku: qrText },
        relations: ['oee'],
      });

      if (foundProduct && foundProduct.oee) {
        this.logger.log(
          `✅ SKU Match found for ${qrText}: Product ID ${foundProduct.productId}, OEE ID ${foundProduct.oee.masterOeeId}`,
        );
        const dataToSend = {
          status: 'FOUND',
          oeeId: foundProduct.oee.masterOeeId,
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
          foundProduct.oee.masterOeeId,
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

  async importFromCsv(
    filePath: string,
    productList: ProductDto[],
    masterOeeId: number,
  ): Promise<ImportResult> {
    const failedRows: FailedRow[] = [];
    const inserted: QrProduct[] = [];

    const nameToIdMap: Map<string, string> = new Map(
      productList.map((p) => [p.name.trim(), p.id]),
    );

    console.log(
      `📥 [Import Start] file = ${filePath}, masterOeeId = ${masterOeeId}`,
    );
    console.debug(`📦 Product list: ${productList.length} items`);
    console.debug(`🗺️ Mapped names = [${[...nameToIdMap.keys()].join(', ')}]`);
    const oee = await this.oeeRepository.findOne({ where: { masterOeeId } });

    if (!oee) {
      throw new NotFoundException(
        `OEE with masterOeeId #${masterOeeId} not found`,
      );
    }

    return new Promise((resolve, reject) => {
      const results: CsvRow[] = [];

      createReadStream(filePath)
        .pipe(
          csvParser({
            headers: ['qrFormatSku', 'specialFactor', 'productName'],
            skipLines: 1,
          }),
        )
        .on('data', (row: CsvRow) => {
          console.debug(`📄 [Row Read]`, row);
          results.push(row);
        })
        .on('end', async () => {
          console.log(`📊 Total rows parsed: ${results.length}`);
          for (const [index, row] of results.entries()) {
            const trimmedProductName = row.productName?.trim();
            const productId: string | undefined =
              nameToIdMap.get(trimmedProductName);

            if (!productId) {
              console.warn(
                `⚠️ [Row ${index}] Product name "${trimmedProductName}" not found in productList`,
              );
              failedRows.push({
                index,
                reason: 'Product name not matched',
                row,
              });
              continue;
            }

            try {
              const product: QrProduct = this.qrProductRepo.create({
                qrFormatSku: row.qrFormatSku?.trim(),
                specialFactor: parseFloat(row.specialFactor),
                productId,
                productName: trimmedProductName,
                masterOeeId: masterOeeId,
                oeeId: oee.id,
              });

              console.debug(`✅ [Row ${index}] Inserting QrProduct:`, product);

              await this.qrProductRepo.save(product);
              inserted.push(product);
            } catch (err: any) {
              console.error(`❌ [Row ${index}] Insert failed: ${err.message}`);
              failedRows.push({
                index,
                reason: err.message,
                row,
              });
            }
          }

          const result: ImportResult = {
            successCount: inserted.length,
            failCount: failedRows.length,
            failedRows,
          };

          console.log(
            `✅ [Import Done] success = ${result.successCount}, failed = ${result.failCount}`,
          );

          resolve(result);
        })
        .on('error', (err: Error) => {
          console.error(`❌ [CSV Read Error] ${err.message}`);
          reject(err);
        });
    });
  }
}
