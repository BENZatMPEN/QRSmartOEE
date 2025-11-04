import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateQrProductDto {
  @IsString()
  @IsNotEmpty()
  qrFormatSku: string;

  @IsNumber()
  @IsOptional()
  specialFactor?: number;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsNumber()
  @IsNotEmpty()
  oeeId: number;

  @IsNumber()
  @IsNotEmpty()
  masterOeeId: number;
}
