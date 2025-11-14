import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateScanSourceDto {
  @IsString()
  @IsNotEmpty()
  scanSource: string;
}
