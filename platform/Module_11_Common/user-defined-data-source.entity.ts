import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Organization } from "../../organizations/entities/organization.entity"; // Assuming path to Organization entity

export enum DataSourceType {
  REST_API = "REST_API",
  JSON_URL = "JSON_URL",
  CSV_URL = "CSV_URL",
}

@Entity("user_defined_data_sources")
@Index(["name", "organization"], { unique: true })
export class UserDefinedDataSource {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({
    type: "enum",
    enum: DataSourceType,
  })
  type: DataSourceType;

  @Column({ type: "jsonb" })
  connection_config: Record<string, any>; // Stores type-specific details, including potentially sensitive info that needs encryption at service layer

  @Column({ type: "jsonb", nullable: true })
  schema_definition?: Record<string, any>; // User-provided sample JSON or schema

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Foreign Key to Organization
  @ManyToOne(() => Organization, (organization) => organization.id, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column()
  organization_id: string;

  // created_by_user_id can be added if user tracking is needed for this entity
  // @Column({ nullable: true }) // Or false if always required
  // created_by_user_id: string;
}

