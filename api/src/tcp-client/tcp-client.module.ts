import { Module } from '@nestjs/common';
import { TcpClientService } from './tcp-client.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Oee } from '../oee/entities/oee.entity';

@Module({
  imports: [EventEmitterModule, TypeOrmModule.forFeature([Oee])],
  providers: [TcpClientService],
  exports: [TcpClientService],
})
export class TcpClientModule {}
