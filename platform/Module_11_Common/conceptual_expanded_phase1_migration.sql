-- Conceptual SQL Migration for Expanded Phase 1 Entities
-- Generated: 2025-05-13
-- NOTE: This is a conceptual representation. Actual SQL may vary slightly based on TypeORM generation.

-- Create organizations table (placeholder)
CREATE TABLE "organizations" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying,
    "address" character varying,
    CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id")
);

-- Create users table (placeholder)
CREATE TABLE "users" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying,
    "email" character varying UNIQUE,
    "organization_id" character varying,
    CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
);

-- Create invoice_template_masters table
CREATE TYPE "public"."invoice_template_masters_status_enum" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);
CREATE TABLE "invoice_template_masters" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying NOT NULL,
    "description" character varying,
    "status" "public"."invoice_template_masters_status_enum" NOT NULL DEFAULT 'DRAFT',
    "latest_published_version_number" integer,
    "latest_draft_version_number" integer,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "organization_id" character varying NOT NULL, -- Assuming this was changed from uuid to character varying to match placeholder
    "created_by_user_id" character varying, -- Assuming this was changed from uuid to character varying
    "updated_by_user_id" character varying, -- Assuming this was changed from uuid to character varying
    CONSTRAINT "PK_invoice_template_masters_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_invoice_template_masters_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_invoice_template_masters_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_invoice_template_masters_updated_by_user_id" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "IDX_invoice_template_masters_name_organization" ON "invoice_template_masters" ("name", "organization_id");

-- Create invoice_template_versions table
CREATE TABLE "invoice_template_versions" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "template_master_id" uuid NOT NULL,
    "version_number" integer NOT NULL,
    "template_definition" jsonb NOT NULL,
    "comment" text,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "created_by_user_id" character varying, -- Assuming this was changed from uuid to character varying
    CONSTRAINT "PK_invoice_template_versions_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_invoice_template_versions_template_master_id" FOREIGN KEY ("template_master_id") REFERENCES "invoice_template_masters"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_invoice_template_versions_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "IDX_invoice_template_versions_master_version" ON "invoice_template_versions" ("template_master_id", "version_number");

-- Create user_defined_data_sources table
CREATE TYPE "public"."user_defined_data_sources_source_type_enum" AS ENUM (
    'REST_API',
    'JSON_FILE_URL',
    'CSV_FILE_URL'
);
CREATE TYPE "public"."user_defined_data_sources_auth_method_enum" AS ENUM (
    'NONE',
    'API_KEY',
    'BASIC_AUTH'
);
CREATE TABLE "user_defined_data_sources" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying NOT NULL,
    "description" character varying,
    "source_type" "public"."user_defined_data_sources_source_type_enum" NOT NULL,
    "connection_config" jsonb NOT NULL, -- Stores encrypted connection details
    "schema_definition" jsonb, -- Conceptual schema
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "organization_id" character varying NOT NULL, -- Assuming this was changed from uuid to character varying
    "created_by_user_id" character varying, -- Assuming this was changed from uuid to character varying
    CONSTRAINT "PK_user_defined_data_sources_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_user_defined_data_sources_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_user_defined_data_sources_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "IDX_user_defined_data_sources_name_organization" ON "user_defined_data_sources" ("name", "organization_id");

-- Alter existing invoice_templates table (if it was the old single table model)
-- This step depends on whether 'invoice_templates' was the original table before versioning.
-- If 'invoice_templates' is now effectively replaced by 'invoice_template_versions' and 'invoice_template_masters',
-- then this might involve dropping the old 'invoice_templates' table or renaming it.
-- For this conceptual migration, we assume 'invoice_templates' was the old structure and might need to be archived or removed.
-- For example, if 'invoice_templates' was the old entity:
-- ALTER TABLE "invoice_templates" RENAME TO "invoice_templates_old_archived";
-- OR, if it was already removed and replaced by the new master/version structure, no action here.

-- Note: The original 'invoice_template' entity was kept in data-source.ts.
-- If it's intended to be kept alongside the new versioned system, its schema would be:
CREATE TABLE "invoice_templates" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying NOT NULL,
    "template_definition" text NOT NULL, -- Assuming it was text, not JSONB like the new versioned one
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "organization_id" character varying, -- Assuming this was changed from uuid to character varying
    CONSTRAINT "PK_invoice_templates_id" PRIMARY KEY ("id")
);
-- If 'invoice_templates' is meant to be the *active* content from a version, this structure is too simple
-- and the application logic would handle which version's content is used.
-- The current entity structure implies 'invoice_template' is a separate, non-versioned template system.

-- Ensure uuid-ossp extension is enabled if not already
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

