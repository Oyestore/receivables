import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { InvoiceTemplateMaster } from "./invoice-template-master.entity";
import { User } from "../../auth/entities/user.entity"; // Corrected path to User entity

@Entity("invoice_template_versions")
@Index(["templateMaster", "version_number"], { unique: true })
export class InvoiceTemplateVersion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => InvoiceTemplateMaster, (master) => master.versions, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "template_master_id" })
  templateMaster: InvoiceTemplateMaster;

  @Column()
  template_master_id: string;

  @Column({ type: "integer" })
  version_number: number;

  @Column({ type: "jsonb" }) // Stores the GrapesJS project data (components, styles, etc.)
  template_definition: Record<string, any>;

  @Column({ type: "text", nullable: true })
  comment?: string; // User comment for this specific version

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.id, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by_user_id" })
  created_by_user?: User;

  @Column({ nullable: true })
  created_by_user_id?: string;
}

