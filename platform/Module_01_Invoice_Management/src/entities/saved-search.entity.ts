import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('saved_searches')
export class SavedSearch {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('varchar', { length: 100 })
    name: string;

    @Column('text', { nullable: true })
    description: string;

    @Column('jsonb')
    filters: {
        status?: string[];
        client_ids?: string[];
        amount_min?: number;
        amount_max?: number;
        date_from?: Date;
        date_to?: Date;
        overdue_only?: boolean;
        payment_terms?: string[];
        tags?: string[];
        full_text?: string;
        recurring_only?: boolean;
        has_attachments?: boolean;
    };

    @Column('uuid')
    user_id: string;

    @Column('uuid')
    tenant_id: string;

    @Column('boolean', { default: false })
    is_shared: boolean;

    @Column('boolean', { default: false })
    is_favorite: boolean;

    @Column('integer', { default: 0 })
    usage_count: number;

    @CreateDateColumn()
    created_at: Date;

    @Column('timestamp', { nullable: true })
    last_used_at: Date;
}
