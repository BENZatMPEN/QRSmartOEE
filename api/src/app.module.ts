// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OeeModule } from './oee/oee.module';
import { AuthModule } from './auth/auth.module';
import { TcpClientModule } from './tcp-client/tcp-client.module';
import { QrUpdatesGateway } from './qr-updates/qr-updates.gateway';
import { QrUpdatesModule } from './qr-updates/qr-updates.module';
import { BatchModule } from './batch/batch.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
    }),
    OeeModule,
    AuthModule,
    TcpClientModule,
    QrUpdatesModule,
    BatchModule,
  ],
  providers: [QrUpdatesGateway],
})
export class AppModule {}
