import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';

export enum ChatPersona {
    CFO = 'CFO', // Face A: Internal SME
    CONCIERGE = 'CONCIERGE' // Face B: External Payer
}

@Entity('chat_sessions')
export class ChatSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    tenantId: string; // The SME owning the data

    @Column({ nullable: true })
    userId: string; // If Internal (SME User ID)

    @Column({ nullable: true })
    externalReferenceId: string; // If External (Invoice ID or Payer Token)

    @Column({
        type: 'varchar', // 'enum' type can be tricky in some DBs without specific config
        default: ChatPersona.CFO
    })
    persona: ChatPersona;

    @Column({ type: 'text', nullable: true })
    lastMessage: string;

    @Column({ default: 'en' })
    language: string; // Context for Polyglot Engine

    /**
     * JSONB metadata for storing dynamic session data
     * Used by integration services for payment, dispute, referral tracking
     */
    @Column('jsonb', { nullable: true, default: {} })
    metadata?: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'jsonb', nullable: true })
    messages: any[]; // Storing conversation history (simplified for JSONB)
}
