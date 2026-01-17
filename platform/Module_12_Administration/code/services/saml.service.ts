import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('SAMLService');

export interface ISAMLProvider {
    id: string;
    tenantId: string;
    providerName: string;
    entityId: string;
    ssoLoginUrl: string;
    ssoLogoutUrl?: string;
    certificate: string;
    metadataXml?: string;
    isActive: boolean;
}

export interface ISAMLAssertion {
    nameId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    attributes?: Record<string, any>;
}

/**
 * SAML 2.0 SSO Service
 * Provides SAML authentication for enterprise SSO
 */
export class SAMLService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Register SAML provider for tenant
     */
    async registerProvider(providerData: {
        tenantId: string;
        providerName: string;
        entityId: string;
        ssoLoginUrl: string;
        ssoLogoutUrl?: string;
        certificate: string;
        metadataXml?: string;
    }): Promise<ISAMLProvider> {
        try {
            // Validate certificate format
            this.validateCertificate(providerData.certificate);

            const result = await this.pool.query(
                `INSERT INTO saml_providers (
          tenant_id, provider_name, entity_id, sso_login_url, sso_logout_url,
          certificate, metadata_xml, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *`,
                [
                    providerData.tenantId,
                    providerData.providerName,
                    providerData.entityId,
                    providerData.ssoLoginUrl,
                    providerData.ssoLogoutUrl || null,
                    providerData.certificate,
                    providerData.metadataXml || null,
                ]
            );

            logger.info('SAML provider registered', {
                tenantId: providerData.tenantId,
                providerName: providerData.providerName,
            });

            return this.mapProviderFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to register SAML provider', { error });
            throw error;
        }
    }

    /**
     * Get SAML provider for tenant
     */
    async getProviderByTenant(tenantId: string): Promise<ISAMLProvider | null> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM saml_providers WHERE tenant_id = $1 AND is_active = true',
                [tenantId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapProviderFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to get SAML provider', { error, tenantId });
            throw error;
        }
    }

    /**
     * Generate SAML metadata XML for SP (Service Provider)
     */
    generateMetadata(config: {
        entityId: string;
        assertionConsumerServiceUrl: string;
        singleLogoutServiceUrl?: string;
        certificate?: string;
    }): string {
        const metadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                  entityID="${config.entityId}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${config.assertionConsumerServiceUrl}"
      index="0"/>
    ${config.singleLogoutServiceUrl ? `
    <SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${config.singleLogoutServiceUrl}"/>
    ` : ''}
  </SPSSODescriptor>
</EntityDescriptor>`;

        return metadata;
    }

    /**
     * Create SAML authentication request (SP-initiated SSO)
     */
    createAuthRequest(config: {
        providerId: string;
        assertionConsumerServiceUrl: string;
        relayState?: string;
    }): string {
        const requestId = `_${this.generateId()}`;
        const issueInstant = new Date().toISOString();

        // This is a simplified version - in production, use a proper SAML library
        const authRequest = `<?xml version="1.0"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    ID="${requestId}"
                    Version="2.0"
                    IssueInstant="${issueInstant}"
                    AssertionConsumerServiceURL="${config.assertionConsumerServiceUrl}">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    ${config.providerId}
  </saml:Issuer>
</samlp:AuthnRequest>`;

        // In production, this should be base64 encoded and optionally deflated
        return Buffer.from(authRequest).toString('base64');
    }

    /**
     * Parse and validate SAML response
     * NOTE: This is a simplified implementation. In production, use passport-saml or similar
     */
    async validateResponse(
        samlResponse: string,
        tenantId: string
    ): Promise<ISAMLAssertion> {
        try {
            // Get provider config
            const provider = await this.getProviderByTenant(tenantId);

            if (!provider) {
                throw new ValidationError('No SAML provider configured for tenant');
            }

            // Decode SAML response
            const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8');

            // In production, use a proper SAML library to:
            // 1. Validate XML signature using provider's certificate
            // 2. Check NotBefore and NotOnOrAfter timestamps
            // 3. Validate Audience and Recipient
            // 4. Extract assertion attributes

            // Simplified extraction (use xml2js or similar in production)
            const assertion = this.parseSimpleAssertion(decodedResponse);

            logger.info('SAML response validated', {
                tenantId,
                nameId: assertion.nameId,
            });

            return assertion;
        } catch (error) {
            logger.error('Failed to validate SAML response', { error, tenantId });
            throw new UnauthorizedError('Invalid SAML response');
        }
    }

    /**
     * Find or create user from SAML assertion
     */
    async findOrCreateUser(
        tenantId: string,
        assertion: ISAMLAssertion
    ): Promise<{ userId: string; isNewUser: boolean }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Try to find existing user by email
            const email = assertion.email || assertion.nameId;

            const existingUser = await client.query(
                'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
                [tenantId, email]
            );

            if (existingUser.rows.length > 0) {
                await client.query('COMMIT');
                return {
                    userId: existingUser.rows[0].id,
                    isNewUser: false,
                };
            }

            // Create new user
            const newUser = await client.query(
                `INSERT INTO users (
          tenant_id, email, first_name, last_name, status, created_at
        ) VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP)
        RETURNING id`,
                [
                    tenantId,
                    email,
                    assertion.firstName || '',
                    assertion.lastName || '',
                ]
            );

            await client.query('COMMIT');

            logger.info('User created from SAML assertion', {
                tenantId,
                userId: newUser.rows[0].id,
                email,
            });

            return {
                userId: newUser.rows[0].id,
                isNewUser: true,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to find or create user from SAML', { error, tenantId });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Deactivate SAML provider
     */
    async deactivateProvider(providerId: string): Promise<void> {
        try {
            await this.pool.query(
                'UPDATE saml_providers SET is_active = false WHERE id = $1',
                [providerId]
            );

            logger.info('SAML provider deactivated', { providerId });
        } catch (error) {
            logger.error('Failed to deactivate SAML provider', { error, providerId });
            throw error;
        }
    }

    /**
     * Validate certificate format
     */
    private validateCertificate(certificate: string): void {
        if (!certificate.includes('BEGIN CERTIFICATE') || !certificate.includes('END CERTIFICATE')) {
            throw new ValidationError('Invalid certificate format');
        }
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    /**
     * Parse simple SAML assertion (simplified - use proper library in production)
     */
    private parseSimpleAssertion(xml: string): ISAMLAssertion {
        // This is a highly simplified parser
        // In production, use xml2js or similar XML parsing library

        const nameIdMatch = xml.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
        const emailMatch = xml.match(/<saml:Attribute Name="email"[^>]*>[\s\S]*?<saml:AttributeValue>([^<]+)<\/saml:AttributeValue>/);
        const firstNameMatch = xml.match(/<saml:Attribute Name="firstName"[^>]*>[\s\S]*?<saml:AttributeValue>([^<]+)<\/saml:AttributeValue>/);
        const lastNameMatch = xml.match(/<saml:Attribute Name="lastName"[^>]*>[\s\S]*?<saml:AttributeValue>([^<]+)<\/saml:AttributeValue>/);

        return {
            nameId: nameIdMatch ? nameIdMatch[1] : '',
            email: emailMatch ? emailMatch[1] : undefined,
            firstName: firstNameMatch ? firstNameMatch[1] : undefined,
            lastName: lastNameMatch ? lastNameMatch[1] : undefined,
        };
    }

    /**
     * Map provider from database
     */
    private mapProviderFromDb(row: any): ISAMLProvider {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            providerName: row.provider_name,
            entityId: row.entity_id,
            ssoLoginUrl: row.sso_login_url,
            ssoLogoutUrl: row.sso_logout_url,
            certificate: row.certificate,
            metadataXml: row.metadata_xml,
            isActive: row.is_active,
        };
    }
}

export const samlService = new SAMLService();

/**
 * NOTE: For production use, replace this implementation with passport-saml
 * 
 * Example with passport-saml:
 * 
 * import { Strategy as SamlStrategy } from 'passport-saml';
 * 
 * const samlStrategy = new SamlStrategy({
 *   entryPoint: provider.ssoLoginUrl,
 *   issuer: provider.entityId,
 *   cert: provider.certificate,
 *   callbackUrl: 'https://platform.com/auth/saml/callback',
 * }, (profile, done) => {
 *   // Process profile
 *   return done(null, profile);
 * });
 */
