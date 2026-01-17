import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class ComplianceDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    documentType: string;

    @Column()
    documentUrl: string;

    @Column()
    status: string;

    @Column({ nullable: true })
    complianceType: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}
