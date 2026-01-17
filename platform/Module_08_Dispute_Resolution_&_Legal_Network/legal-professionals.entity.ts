import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class LegalProfessional {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    specialty: string;

    @Column()
    barRegistrationNumber: string;

    @Column({ type: 'json', nullable: true })
    credentials: Record<string, any>;

    @Column({ default: true })
    isActive: boolean;
}
