import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class VoiceLanguage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string; // ISO language code

  @Column()
  name: string;

  @Column()
  localName: string; // Name in the language itself

  @Column()
  active: boolean;

  @Column('json')
  supportedDialects: string[];

  @Column('json')
  voiceConfigurations: {
    provider: string;
    voiceId: string;
    gender: string;
    quality: string;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
