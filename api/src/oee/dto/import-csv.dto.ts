import { IsArray, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export interface ProductDto {
  id: string;
  name: string;
}

export class ImportQrProductDto {
  @Transform(({ value }) => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })
  @IsArray({ message: 'productList must be an array' })
  productList: ProductDto[];

  @Type(() => Number)
  @IsNumber({}, { message: 'masterOeeId must be a number' })
  masterOeeId: number;
}
