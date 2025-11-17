import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

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
