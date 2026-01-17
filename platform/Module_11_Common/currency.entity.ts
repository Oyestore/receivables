import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  symbol: string;

  @Column({ nullable: true })
  flag: string;

  @Column({ default: 2 })
  decimalPlaces: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isBaseCurrency: boolean;

  @Column({ nullable: true })
  numericCode: string;

  @Column({ nullable: true })
  countryCode: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
