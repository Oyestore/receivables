
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateModule05Milestones20260104000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        // 1. Create Milestone Definitions Table
        await queryRunner.createTable(new Table({
            name: "milestone_definitions",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, isGenerated: true, generationStrategy: "uuid" },
                { name: "tenantId", type: "uuid" },
                { name: "name", type: "varchar", length: "255" },
                { name: "description", type: "text", isNullable: true },
                { name: "projectId", type: "uuid", isNullable: true },
                { name: "milestoneType", type: "varchar" }, // Enum stored as varchar
                { name: "paymentPercentage", type: "decimal", precision: 5, scale: 2, isNullable: true },
                { name: "paymentAmount", type: "decimal", precision: 15, scale: 2, isNullable: true },
                { name: "plannedStartDate", type: "date" },
                { name: "plannedEndDate", type: "date" },
                { name: "plannedDurationDays", type: "int", isNullable: true },
                { name: "dependencies", type: "jsonb", default: "'[]'" },
                { name: "completionCriteria", type: "jsonb", default: "'{}'" },
                { name: "verificationRequirements", type: "jsonb", default: "'{}'" },
                { name: "isActive", type: "boolean", default: true },
                { name: "isTemplate", type: "boolean", default: false },
                { name: "metadata", type: "jsonb", default: "'{}'" },
                { name: "createdDate", type: "timestamp", default: "now()" },
                { name: "updatedDate", type: "timestamp", default: "now()" },
                { name: "createdBy", type: "uuid" },
                { name: "updatedBy", type: "uuid", isNullable: true },
            ]
        }), true);

        // Indices for Milestone Definitions
        await queryRunner.createIndex("milestone_definitions", new TableIndex({
            name: "IDX_MILESTONE_DEF_TENANT",
            columnNames: ["tenantId"]
        }));

        await queryRunner.createIndex("milestone_definitions", new TableIndex({
            name: "IDX_MILESTONE_DEF_PROJECT",
            columnNames: ["projectId"]
        }));


        // 2. Create Milestone Workflows Table
        await queryRunner.createTable(new Table({
            name: "milestone_workflows",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, isGenerated: true, generationStrategy: "uuid" },
                { name: "tenantId", type: "uuid" },
                { name: "workflowName", type: "varchar", length: "255" },
                { name: "description", type: "text", isNullable: true },
                { name: "workflowType", type: "varchar", default: "'LINEAR'" },
                { name: "workflowStages", type: "jsonb", default: "'[]'" },
                { name: "triggerConditions", type: "jsonb", default: "'{}'" },
                { name: "approvalChain", type: "jsonb", default: "'[]'" },
                { name: "isTemplate", type: "boolean", default: false },
                { name: "isActive", type: "boolean", default: true },
                { name: "metadata", type: "jsonb", default: "'{}'" },
                { name: "createdDate", type: "timestamp", default: "now()" },
                { name: "updatedDate", type: "timestamp", default: "now()" },
                { name: "createdBy", type: "uuid" }
            ]
        }), true);

        // Indices for Milestone Workflows
        await queryRunner.createIndex("milestone_workflows", new TableIndex({
            name: "IDX_MILESTONE_WF_TENANT",
            columnNames: ["tenantId"]
        }));

        await queryRunner.createIndex("milestone_workflows", new TableIndex({
            name: "IDX_MILESTONE_WF_TEMPLATE",
            columnNames: ["isTemplate"]
        }));


        // 3. Create Milestone Instances Table
        await queryRunner.createTable(new Table({
            name: "milestone_instances",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, isGenerated: true, generationStrategy: "uuid" },
                { name: "tenantId", type: "uuid" },
                { name: "definitionId", type: "uuid" },
                { name: "workflowId", type: "uuid", isNullable: true },
                { name: "currentStatus", type: "varchar", default: "'PENDING'" },
                { name: "progressPercentage", type: "decimal", precision: 5, scale: 2, default: 0 },
                { name: "actualStartDate", type: "date", isNullable: true },
                { name: "actualEndDate", type: "date", isNullable: true },
                { name: "plannedEndDate", type: "date", isNullable: true },
                { name: "daysDelayed", type: "int", default: 0 },
                { name: "verificationStatus", type: "varchar", default: "'NOT_STARTED'" },
                { name: "escalationLevel", type: "int", default: 0 },
                { name: "currentOwnerId", type: "uuid", isNullable: true },
                { name: "statusNotes", type: "text", isNullable: true },
                { name: "metadata", type: "jsonb", default: "'{}'" },
                { name: "createdDate", type: "timestamp", default: "now()" },
                { name: "updatedDate", type: "timestamp", default: "now()" },
                { name: "external_access_key", type: "uuid", isNullable: true },
                { name: "access_pin", type: "varchar", isNullable: true },
                { name: "createdBy", type: "uuid" }
            ]
        }), true);

        // Indices for Milestone Instances
        await queryRunner.createIndex("milestone_instances", new TableIndex({
            name: "IDX_MILESTONE_INST_TENANT",
            columnNames: ["tenantId"]
        }));
        await queryRunner.createIndex("milestone_instances", new TableIndex({
            name: "IDX_MILESTONE_INST_DEF",
            columnNames: ["definitionId"]
        }));
        await queryRunner.createIndex("milestone_instances", new TableIndex({
            name: "IDX_MILESTONE_INST_STATUS",
            columnNames: ["currentStatus"]
        }));
        await queryRunner.createIndex("milestone_instances", new TableIndex({
            name: "IDX_MILESTONE_INST_ESC",
            columnNames: ["escalationLevel"]
        }));
        await queryRunner.createIndex("milestone_instances", new TableIndex({
            name: "IDX_MILESTONE_INST_ACCESS",
            columnNames: ["external_access_key"]
        }));

        // Foreign keys for Milestone Instances
        await queryRunner.createForeignKey("milestone_instances", new TableForeignKey({
            columnNames: ["definitionId"],
            referencedColumnNames: ["id"],
            referencedTableName: "milestone_definitions",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("milestone_instances", new TableForeignKey({
            columnNames: ["workflowId"],
            referencedColumnNames: ["id"],
            referencedTableName: "milestone_workflows",
            onDelete: "SET NULL"
        }));


        // 4. Create Milestone Payments Table
        await queryRunner.createTable(new Table({
            name: "milestone_payments",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, isGenerated: true, generationStrategy: "uuid" },
                { name: "milestoneInstanceId", type: "uuid" },
                { name: "invoiceId", type: "uuid", isNullable: true },
                { name: "paymentAmount", type: "decimal", precision: 15, scale: 2 },
                { name: "paymentStatus", type: "varchar", default: "'PENDING'" },
                { name: "invoiceGeneratedDate", type: "timestamp", isNullable: true },
                { name: "paymentDueDate", type: "date", isNullable: true },
                { name: "paymentReceivedDate", type: "date", isNullable: true },
                { name: "paymentReference", type: "varchar", length: "100", isNullable: true },
                { name: "amountReceived", type: "decimal", precision: 15, scale: 2, default: 0 },
                { name: "paymentTerms", type: "jsonb", default: "'{}'" },
                { name: "metadata", type: "jsonb", default: "'{}'" },
                { name: "createdDate", type: "timestamp", default: "now()" },
                { name: "updatedDate", type: "timestamp", default: "now()" }
            ]
        }), true);

        // Indices for Milestone Payments
        await queryRunner.createIndex("milestone_payments", new TableIndex({
            name: "IDX_MILESTONE_PAY_INST",
            columnNames: ["milestoneInstanceId"]
        }));
        await queryRunner.createIndex("milestone_payments", new TableIndex({
            name: "IDX_MILESTONE_PAY_INV",
            columnNames: ["invoiceId"]
        }));
        await queryRunner.createIndex("milestone_payments", new TableIndex({
            name: "IDX_MILESTONE_PAY_STATUS",
            columnNames: ["paymentStatus"]
        }));

        // Foreign keys for Milestone Payments
        // Note: invoiceId links to Module 01 which might be in a different migration context, 
        // so we typically don't adding a hard DB constraint unless guaranteed, 
        // but milestoneInstanceId is within module.
        // For robustness in distributed modules, we often skip hard foreign keys across modules, 
        // but here we are in a monolith DB context.
        // We will add FK for milestoneInstanceId.

        await queryRunner.createForeignKey("milestone_payments", new TableForeignKey({
            columnNames: ["milestoneInstanceId"],
            referencedColumnNames: ["id"],
            referencedTableName: "milestone_instances",
            onDelete: "CASCADE"
        }));


        // 5. Create Milestone Evidence Table
        await queryRunner.createTable(new Table({
            name: "milestone_evidence",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, isGenerated: true, generationStrategy: "uuid" },
                { name: "tenantId", type: "uuid" },
                { name: "milestoneInstanceId", type: "uuid" },
                { name: "evidenceType", type: "varchar" },
                { name: "fileName", type: "varchar", length: "255" },
                { name: "filePath", type: "varchar", length: "500" },
                { name: "mimeType", type: "varchar", length: "100" },
                { name: "fileSize", type: "bigint" },
                { name: "description", type: "text", isNullable: true },
                { name: "status", type: "varchar", default: "'PENDING_REVIEW'" },
                { name: "s3Key", type: "varchar", length: "255", isNullable: true },
                { name: "publicUrl", type: "varchar", length: "500", isNullable: true },
                { name: "metadata", type: "jsonb", default: "'{}'" },
                { name: "uploadedBy", type: "uuid" },
                { name: "reviewedBy", type: "uuid", isNullable: true },
                { name: "reviewedAt", type: "timestamp", isNullable: true },
                { name: "createdAt", type: "timestamp", default: "now()" },
                { name: "updatedAt", type: "timestamp", default: "now()" },
                { name: "isDeleted", type: "boolean", default: false },
                { name: "deletedAt", type: "timestamp", isNullable: true },
                { name: "deletedBy", type: "uuid", isNullable: true }
            ]
        }), true);

        // Indices for Milestone Evidence
        await queryRunner.createIndex("milestone_evidence", new TableIndex({
            name: "IDX_MILESTONE_EVID_INST",
            columnNames: ["milestoneInstanceId"]
        }));
        await queryRunner.createIndex("milestone_evidence", new TableIndex({
            name: "IDX_MILESTONE_EVID_STATUS",
            columnNames: ["status"]
        }));
        await queryRunner.createIndex("milestone_evidence", new TableIndex({
            name: "IDX_MILESTONE_EVID_TYPE",
            columnNames: ["evidenceType"]
        }));

        // Foreign keys for Milestone Evidence
        await queryRunner.createForeignKey("milestone_evidence", new TableForeignKey({
            columnNames: ["milestoneInstanceId"],
            referencedColumnNames: ["id"],
            referencedTableName: "milestone_instances",
            onDelete: "CASCADE"
        }));

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop in reverse order
        await queryRunner.dropTable("milestone_evidence");
        await queryRunner.dropTable("milestone_payments");
        await queryRunner.dropTable("milestone_instances");
        await queryRunner.dropTable("milestone_workflows");
        await queryRunner.dropTable("milestone_definitions");
    }

}
