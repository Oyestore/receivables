import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("users") // Table name often plural
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  name: string;

  // Add other basic fields if necessary for your data-source.ts or other entities to compile
  // For now, keeping it minimal
  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true })
  organization_id: string; // Assuming a simple string ID for now
}

