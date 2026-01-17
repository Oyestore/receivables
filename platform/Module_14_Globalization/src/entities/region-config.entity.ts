import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('region_config')
export class RegionConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    tenantId: string;

    @Column({ default: 'en-US' })
    locale: string; // en-IN, ar-AE, de-DE

    @Column({ default: 'UTC' })
    timezone: string; // Asia/Kolkata, Asia/Dubai

    @Column({ default: 'DD/MM/YYYY' })
    dateFormat: string;

    @Column({ default: ',' })
    numberSeparator: string; // ',' or '.'

    @Column({ type: 'simple-array', nullable: true })
    workingDays: number[]; // 0=Sun, 1=Mon. e.g. [1,2,3,4,5] for Mon-Fri

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('public_holiday')
export class PublicHoliday {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    tenantId: string;

    @Column()
    name: string; // "Diwali", "Eid", "Christmas"

    @Column('date')
    date: Date;

    @Column({ default: true })
    isRecurring: boolean;
}
