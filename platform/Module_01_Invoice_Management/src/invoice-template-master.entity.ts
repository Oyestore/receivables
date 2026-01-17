import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from "typeorm";
import { Organization } from "../../organizations/entities/organization.entity";
import { User } from "../../auth/entities/user.entity"; // Corrected path to User entity
import { InvoiceTemplateVersion } from "./invoice-template-version.entity";

export enum TemplateStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

@Entity("invoice_template_masters")
@Index(["name", "organization"], { unique: true })
export class InvoiceTemplateMaster {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: "enum",
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT,
  })
  status: TemplateStatus;

  @Column({ nullable: true }) // Stores the version number of the currently active/latest published version
  latest_published_version_number?: number;

  @Column({ nullable: true }) // Stores the version number of the current draft/latest saved version
  latest_draft_version_number?: number; 

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Organization, (organization) => organization.id, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column()
  organization_id: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by_user_id" })
  created_by_user?: User;

  @Column({ nullable: true })
  created_by_user_id?: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "updated_by_user_id" })
  updated_by_user?: User;

  @Column({ nullable: true })
  updated_by_user_id?: string;

  @OneToMany(() => InvoiceTemplateVersion, (version) => version.templateMaster, { cascade: true })
  versions: InvoiceTemplateVersion[];

  // This field can point to the specific InvoiceTemplateVersion entity that is currently active
  // It might be more robust to query for the latest_published_version_number from the versions relationship
  // @ManyToOne(() => InvoiceTemplateVersion, { nullable: true, eager: false })
  // @JoinColumn({ name: "active_version_id" })
  // active_version?: InvoiceTemplateVersion;

  // @Column({ nullable: true })
  // active_version_id?: string;
}

