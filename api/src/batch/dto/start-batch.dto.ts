import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class StartBatchDto {
  @IsNumber()
  @IsNotEmpty()
  oeeId: number;

  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @IsString()
  @IsNotEmpty()
  lotNumber: string;
}
