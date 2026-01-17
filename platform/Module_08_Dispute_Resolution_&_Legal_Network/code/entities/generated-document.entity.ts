import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { DisputeCase } from './dispute-case.entity';
import { DocumentTemplate } from './document-template.entity';

export enum GeneratedDocumentStatus {
    DRAFT = 'draft',
    GENERATED = 'generated',
    SIGNED = 'signed',
    SENT = 'sent',
    DELIVERED = 'delivered',
}

@Entity('generated_documents')
@Index(['disputeCaseId'])
@Index(['status'])
export class GeneratedDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    disputeCaseId: string;

    @Column({ type: 'uuid' })
    templateId: string;

    @Column({ type: 'varchar', length: 50 })
    documentType: string;

    @Column({ type: 'varchar', length: 10 })
    language: string;

    @Column({ type: 'varchar', length: 500 })
    filePath: string;

    @Column({ type: 'int' })
    fileSize: number;

    @Column({
        type: 'enum',
        enum: GeneratedDocumentStatus,
        default: GeneratedDocumentStatus.DRAFT,
    })
    status: GeneratedDocumentStatus;

    // Variables used to generate this document
    @Column({ type: 'jsonb' })
    variables: Record<string, any>;

    @CreateDateColumn()
    generatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    signedAt: Date;

    @Column({ type: 'jsonb', nullable: true })
    signatureData: {
        signedBy?: string;
        signatureMethod?: string;
        certificateId?: string;
        timestamp?: Date;
    };

    @Column({ type: 'uuid' })
    generatedBy: string;

    // Relations
    @ManyToOne(() => DisputeCase)
    @JoinColumn({ name: 'disputeCaseId' })
    disputeCase: DisputeCase;

    @ManyToOne(() => DocumentTemplate)
    @JoinColumn({ name: 'templateId' })
    template: DocumentTemplate;
}
