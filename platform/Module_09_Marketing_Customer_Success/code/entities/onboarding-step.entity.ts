import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OnboardingWorkflow } from './onboarding-workflow.entity';

export enum StepStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    SKIPPED = 'SKIPPED',
}

@Entity('onboarding_steps')
export class OnboardingStep {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: StepStatus,
        default: StepStatus.PENDING,
    })
    status: StepStatus;

    @Column({ type: 'int' })
    order: number;

    @Column({ nullable: true })
    completedAt: Date;

    @ManyToOne(() => OnboardingWorkflow, (workflow) => workflow.steps)
    workflow: OnboardingWorkflow;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
