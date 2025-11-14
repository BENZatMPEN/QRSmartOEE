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
  masterOeeId: number;

  @Column({ length: 255 })
  oeeName: string;

  @Column({ length: 100, unique: true })
  machineCode: string;

  @Column({ nullable: true })
  qrStartFormat: string;

  @Column({ nullable: true })
  qrStopFormat: string;

  @Column({ nullable: true })
  modbusAddress: number;

  @Column({ nullable: true })
  tcpIp: string;

  @Column({ nullable: true })
  port: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: 'TCP',
  })
  scanSource: string;

  @Column({ default: 'PD' })
  pdPrefixFormat: string;

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
