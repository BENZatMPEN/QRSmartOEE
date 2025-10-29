import { Module } from '@nestjs/common';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Oee } from '../oee/entities/oee.entity';
import { QrProduct } from '../oee/entities/qr-product.entity';

@Module({
  // ✨ 2. เพิ่ม imports array และ TypeOrmModule.forFeature
  imports: [TypeOrmModule.forFeature([Oee, QrProduct])],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
