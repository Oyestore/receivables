import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('invoice_lifecycle_events')
export class InvoiceLifecycleEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    invoice_id: string;

    @Column('varchar', { length: 50 })
    event_type:
        | 'created'
        | 'draft_saved'
        | 'sent'
        | 'viewed'
        | 'downloaded'
        | 'payment_link_clicked'
        | 'payment_initiated'
        | 'partially_paid'
        | 'fully_paid'
        | 'overdue'
        | 'reminder_sent'
        | 'disputed'
        | 'cancelled'
        | 'updated';

    @Column('jsonb', { nullable: true })
    metadata: {
        user_id?: string;
        ip_address?: string;
        user_agent?: string;
        channel?: string; // email, whatsapp, portal, api
        amount?: number;
        previous_status?: string;
        new_status?: string;
        changes?: any;
        notes?: string;
    };

    @CreateDateColumn()
    occurred_at: Date;

    @Column('uuid')
    tenant_id: string;

    @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;
}
