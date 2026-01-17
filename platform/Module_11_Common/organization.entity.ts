import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("organizations") // Table name often plural
export class Organization {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  name: string;

  // Add other basic fields if necessary
  @Column({ nullable: true })
  address: string;
}

