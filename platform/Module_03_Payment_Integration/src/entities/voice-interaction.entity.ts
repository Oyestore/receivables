import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class VoiceInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column()
  organizationId: string;

  @Column()
  sessionId: string;

  @Column()
  interactionType: string; // 'payment', 'reminder', 'status', etc.

  @Column()
  languageCode: string;

  @Column()
  startTime: Date;

  @Column()
  endTime: Date;

  @Column()
  duration: number; // in seconds

  @Column()
  status: string; // 'completed', 'abandoned', 'failed', etc.

  @Column('json')
  interactionFlow: {
    step: string;
    intent: string;
    confidence: number;
    timestamp: Date;
  }[];

  @Column('json')
  paymentDetails: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
    status: string;
  };

  @Column('json')
  metrics: {
    speechRecognitionAccuracy: number;
    userSatisfactionScore: number;
    completionRate: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
