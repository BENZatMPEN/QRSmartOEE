import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
} from 'class-validator';

// DTO สำหรับแต่ละรายการใน qrProducts
class QrProductDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsString()
  @IsNotEmpty()
  qrFormatSku: string; // ✨ หมายเหตุ: ผมใช้ qrFormatSku ให้ตรงกับ Entity

  @IsNumber()
  specialFactor: number;
}

// DTO หลักสำหรับสร้าง OEE
export class CreateOeeDto {
  @IsNumber()
  @IsNotEmpty()
  masterOeeId: number;

  @IsString()
  @IsNotEmpty()
  machineCode: string;

  @IsString()
  @IsNotEmpty()
  oeeName: string;

  @IsString()
  qrStartFormat: string;

  @IsString()
  qrStopFormat: string;

  @IsNumber()
  modbusAddress: number;

  @IsString()
  tcpIp: string;

  @IsNumber()
  port: number;

  @IsNumber()
  siteId: number;

  @IsString()
  pdPrefixFormat: string;
}
