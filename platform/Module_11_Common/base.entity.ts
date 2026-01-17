import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

/**
 * Base entity for all entities in the Financing Module
 * 
 * This abstract class provides common fields and functionality for all entities,
 * including multi-tenancy support, audit fields, and soft delete capability.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: false })
  @Index()
  tenantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', nullable: false })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @Column({ name: 'deleted_by', nullable: true })
  deletedBy: string;

  @Column({ name: 'version', default: 1 })
  version: number;
}
