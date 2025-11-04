// src/oee/entities/qr-product.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Oee } from './oee.entity';

@Entity('qr_products')
export class QrProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  qrFormatSku: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: 1.0,
  })
  specialFactor: number;

  @Column()
  productId: string;

  @Column()
  productName: string;

  @ManyToOne(() => Oee, (oee) => oee.qrProducts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'oeeId' })
  oee: Oee;

  @Column({ name: 'oeeId', nullable: false })
  oeeId: number;

  @Column({ name: 'masterOeeId', nullable: false })
  masterOeeId: number;
}
