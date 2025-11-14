import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class ScanUsbDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsNumber()
  @IsNotEmpty()
  oeeId: number;
}
