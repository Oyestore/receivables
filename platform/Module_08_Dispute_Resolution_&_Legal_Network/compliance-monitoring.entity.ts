import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class ComplianceMonitoring {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    entityId: string;

    @Column()
    entityType: string;

    @Column()
    checkType: string;

    @Column()
    status: string;

    @Column({ type: 'json', nullable: true })
    results: Record<string, any>;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    checkDate: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}
