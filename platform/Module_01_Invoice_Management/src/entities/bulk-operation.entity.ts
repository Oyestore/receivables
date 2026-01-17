import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('bulk_operations')
export class BulkOperation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('varchar', { length: 50 })
    operation_type:
        | 'bulk_update'
        | 'bulk_delete'
        | 'bulk_send'
        | 'bulk_approve'
        | 'bulk_export'
        | 'bulk_archive';

    @Column('jsonb')
    parameters: {
        invoice_ids?: string[];
        filters?: any;
        updates?: any;
        export_format?: string;
    };

    @Column('varchar', { length: 20 })
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

    @Column('integer', { default: 0 })
    total_items: number;

    @Column('integer', { default: 0 })
    processed_items: number;

    @Column('integer', { default: 0 })
    success_count: number;

    @Column('integer', { default: 0 })
    failure_count: number;

    @Column('jsonb', { nullable: true, default: [] })
    errors: Array<{
        invoice_id: string;
        invoice_number?: string;
        error: string;
    }>;

    @Column('text', { nullable: true })
    result_url: string; // For exports

    @Column('uuid')
    initiated_by: string;

    @Column('uuid')
    tenant_id: string;

    @CreateDateColumn()
    created_at: Date;

    @Column('timestamp', { nullable: true })
    started_at: Date;

    @Column('timestamp', { nullable: true })
    completed_at: Date;
}
