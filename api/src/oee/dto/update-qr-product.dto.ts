import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateQrProductDto {
  @IsString()
  @IsOptional()
  qrFormatSku?: string;

  @IsNumber()
  @IsOptional()
  specialFactor?: number;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  productName?: string;
}
