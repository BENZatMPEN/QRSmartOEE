import { Module } from '@nestjs/common';
import { OeeService } from './oee.service';
import { OeeController } from './oee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Oee } from './entities/oee.entity';
import { QrProduct } from './entities/qr-product.entity';
import { QrUpdatesModule } from '../qr-updates/qr-updates.module';

@Module({
  imports: [TypeOrmModule.forFeature([Oee, QrProduct]), QrUpdatesModule],
  controllers: [OeeController],
  providers: [OeeService],
})
export class OeeModule {}
