import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateComplianceTables1705500000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension if not already enabled
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ===== Compliance Standards Table =====
        await queryRunner.query(`
      CREATE TABLE compliance_standards (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        standard_code VARCHAR(50) UNIQUE NOT NULL,
        standard_name VARCHAR(255) NOT NULL,
        version VARCHAR(50),
        description TEXT,
        authority VARCHAR(255),
        effective_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_standards_code ON compliance_standards(standard_code);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_standards_active ON compliance_standards(is_active);
    `);

        // ===== Compliance Controls Table =====
        await queryRunner.query(`
      CREATE TABLE compliance_controls (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        standard_id UUID NOT NULL REFERENCES compliance_standards(id) ON DELETE CASCADE,
        control_id VARCHAR(100) NOT NULL,
        control_name VARCHAR(255) NOT NULL,
        control_category VARCHAR(100),
        control_type VARCHAR(50) NOT NULL CHECK (control_type IN ('preventive', 'detective', 'corrective', 'administrative')),
        description TEXT,
        test_frequency VARCHAR(50) NOT NULL CHECK (test_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'on_demand')),
        automated_test BOOLEAN DEFAULT false,
        test_script JSONB,
        risk_level VARCHAR(50) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_standard_control UNIQUE(standard_id, control_id)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_controls_standard ON compliance_controls(standard_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_controls_automated ON compliance_controls(automated_test);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_controls_frequency ON compliance_controls(test_frequency);
    `);

        // ===== Compliance Audits Table =====
        await queryRunner.query(`
      CREATE TABLE compliance_audits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        standard_id UUID NOT NULL REFERENCES compliance_standards(id),
        audit_number VARCHAR(100) UNIQUE NOT NULL,
        audit_date DATE NOT NULL,
        auditor_id UUID,
        auditor_name VARCHAR(255),
        audit_type VARCHAR(50) NOT NULL CHECK (audit_type IN ('internal', 'external', 'self_assessment', 'certification')),
        scope TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
        findings_count INTEGER DEFAULT 0 CHECK (findings_count >= 0),
        critical_findings INTEGER DEFAULT 0 CHECK (critical_findings >= 0),
        high_findings INTEGER DEFAULT 0 CHECK (high_findings >= 0),
        medium_findings INTEGER DEFAULT 0 CHECK (medium_findings >= 0),
        low_findings INTEGER DEFAULT 0 CHECK (low_findings >= 0),
        score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
        result VARCHAR(50) CHECK (result IN ('pass', 'pass_with_findings', 'fail', 'pending')),
        start_date DATE,
        completion_date DATE,
        report_url TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_audit_dates CHECK (start_date IS NULL OR completion_date IS NULL OR start_date <= completion_date)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_audits_tenant ON compliance_audits(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_audits_standard ON compliance_audits(standard_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_audits_status ON compliance_audits(status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_audits_date ON compliance_audits(audit_date DESC);
    `);

        // ===== Compliance Findings Table =====
        await queryRunner.query(`
      CREATE TABLE compliance_findings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        audit_id UUID NOT NULL REFERENCES compliance_audits(id) ON DELETE CASCADE,
        control_id UUID REFERENCES compliance_controls(id),
        finding_number VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        finding_type VARCHAR(50) CHECK (finding_type IN ('non_conformance', 'observation', 'opportunity', 'best_practice')),
        finding_description TEXT NOT NULL,
        evidence TEXT,
        impact_assessment TEXT,
        remediation_plan TEXT,
        assigned_to UUID,
        due_date DATE,
        priority INTEGER CHECK (priority >= 1 AND priority <= 5),
        status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'verified', 'closed', 'accepted_risk')),
        resolution_notes TEXT,
        resolved_at TIMESTAMP,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_audit_finding UNIQUE(audit_id, finding_number)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_findings_audit ON compliance_findings(audit_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_findings_status ON compliance_findings(status, severity);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_findings_assigned ON compliance_findings(assigned_to);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_findings_due ON compliance_findings(due_date);
    `);

        // ===== Compliance Evidence Table =====
        await queryRunner.query(`
      CREATE TABLE compliance_evidence (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        control_id UUID REFERENCES compliance_controls(id),
        audit_id UUID REFERENCES compliance_audits(id),
        finding_id UUID REFERENCES compliance_findings(id),
        evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN ('document', 'screenshot', 'log', 'certificate', 'report', 'video', 'other')),
        evidence_title VARCHAR(255) NOT NULL,
        evidence_description TEXT,
        file_path TEXT,
        file_size INTEGER,
        file_hash VARCHAR(255),
        collected_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        collected_by UUID,
        retention_date DATE,
        is_archived BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_evidence_tenant ON compliance_evidence(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_evidence_control ON compliance_evidence(control_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_evidence_audit ON compliance_evidence(audit_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_evidence_retention ON compliance_evidence(retention_date);
    `);

        // ===== Control Test Results Table =====
        await queryRunner.query(`
      CREATE TABLE control_test_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        control_id UUID NOT NULL REFERENCES compliance_controls(id),
        test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        test_type VARCHAR(50) CHECK (test_type IN ('automated', 'manual', 'walkthrough', 'inspection')),
        test_result VARCHAR(50) NOT NULL CHECK (test_result IN ('pass', 'fail', 'warning', 'not_applicable')),
        test_details JSONB,
        tested_by UUID,
        evidence_id UUID REFERENCES compliance_evidence(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_control_test_results_tenant ON control_test_results(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_control_test_results_control ON control_test_results(control_id, test_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_control_test_results_result ON control_test_results(test_result);
    `);

        // ===== Compliance Status Table =====
        await queryRunner.query(`
      CREATE TABLE compliance_status (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        standard_id UUID NOT NULL REFERENCES compliance_standards(id),
        status_date DATE NOT NULL DEFAULT CURRENT_DATE,
        overall_score DECIMAL(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
        compliant_controls INTEGER DEFAULT 0,
        total_controls INTEGER DEFAULT 0,
        compliance_percentage DECIMAL(5,2),
        open_findings INTEGER DEFAULT 0,
        critical_findings INTEGER DEFAULT 0,
        last_audit_date DATE,
        next_audit_date DATE,
        certification_status VARCHAR(50) CHECK (certification_status IN ('certified', 'expired', 'in_progress', 'not_certified')),
        certification_expiry DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_standard_date UNIQUE(tenant_id, standard_id, status_date)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_status_tenant ON compliance_status(tenant_id, standard_id, status_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_compliance_status_score ON compliance_status(overall_score);
    `);

        // Insert default compliance standards
        await queryRunner.query(`
      INSERT INTO compliance_standards (standard_code, standard_name, version, description, authority, is_active)
      VALUES
        ('GDPR', 'General Data Protection Regulation', '2016/679', 'EU data protection regulation', 'European Commission', true),
        ('SOC2', 'SOC 2 Type II', '2017', 'Security, Availability, Processing Integrity, Confidentiality, Privacy', 'AICPA', true),
        ('ISO27001', 'ISO/IEC 27001', '2013', 'Information Security Management System', 'ISO', true),
        ('HIPAA', 'Health Insurance Portability and Accountability Act', '1996', 'Healthcare data protection', 'HHS', true),
        ('PCI_DSS', 'Payment Card Industry Data Security Standard', 'v4.0', 'Payment card data security', 'PCI SSC', true)
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS compliance_status CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS control_test_results CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS compliance_evidence CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS compliance_findings CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS compliance_audits CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS compliance_controls CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS compliance_standards CASCADE`);
    }
}
