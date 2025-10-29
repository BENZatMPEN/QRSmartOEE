// src/oee/entities/oee.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QrProduct } from './qr-product.entity';

@Entity('oees')
export class Oee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  oeeId: number;

  @Column({ length: 255 })
  oeeName: string;

  @Column({ length: 100, unique: true })
  machineCode: string;

  @Column({ nullable: true })
  qrStartFormat: string;

  @Column({ nullable: true })
  qrStopFormat: string;

  @Column({ nullable: true })
  modbusAddress: string;

  @OneToMany(() => QrProduct, (qrProduct) => qrProduct.oee, {
    cascade: true,
    eager: true,
  })
  qrProducts: QrProduct[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  siteId: number;
}
