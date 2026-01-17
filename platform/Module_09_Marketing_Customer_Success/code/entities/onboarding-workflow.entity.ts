import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OnboardingStep } from './onboarding-step.entity';

export enum OnboardingStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    STALLED = 'STALLED',
}

@Entity('onboarding_workflows')
export class OnboardingWorkflow {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    customerId: string; // ID of the customer being onboarded

    @Column({
        type: 'enum',
        enum: OnboardingStatus,
        default: OnboardingStatus.NOT_STARTED,
    })
    status: OnboardingStatus;

    @OneToMany(() => OnboardingStep, (step) => step.workflow, { cascade: true })
    steps: OnboardingStep[];

    @Column({ type: 'float', default: 0 })
    progress: number; // Percentage complete (0-100)

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
