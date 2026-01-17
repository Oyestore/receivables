import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum DocumentTemplateType {
    LEGAL_NOTICE = 'legal_notice',
    DEMAND_LETTER = 'demand_letter',
    SETTLEMENT_PROPOSAL = 'settlement_proposal',
    CASE_FILED_NOTICE = 'case_filed_notice',
    RESOLUTION_CERTIFICATE = 'resolution_certificate',
}

export enum TemplateLanguage {
    ENGLISH = 'en',
    HINDI = 'hi',
}

@Entity('document_templates')
@Index(['templateCode'], { unique: true })
@Index(['templateType'])
@Index(['language'])
export class DocumentTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    templateCode: string;

    @Column({ type: 'varchar', length: 200 })
    templateName: string;

    @Column({
        type: 'enum',
        enum: DocumentTemplateType,
    })
    templateType: DocumentTemplateType;

    @Column({
        type: 'enum',
        enum: TemplateLanguage,
        default: TemplateLanguage.ENGLISH,
    })
    language: TemplateLanguage;

    @Column({ type: 'text' })
    content: string;

    // List of variables that can be substituted in the template
    @Column({ type: 'jsonb' })
    variables: {
        name: string;
        type: 'string' | 'number' | 'date' | 'boolean';
        required: boolean;
        description: string;
    }[];

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        category?: string;
        tags?: string[];
        author?: string;
        version?: string;
    };

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'uuid' })
    createdBy: string;

    @Column({ type: 'uuid', nullable: true })
    updatedBy: string;
}
