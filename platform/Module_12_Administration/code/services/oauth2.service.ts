import { Pool } from 'pg';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('OAuth2Service');

export interface IOAuthClient {
    id: string;
    clientId: string;
    clientSecret: string;
    clientName: string;
    redirectUris: string[];
    grants: string[];
    tenantId?: string;
    isTrusted: boolean;
}

export interface IOAuthToken {
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    refreshExpiresAt?: Date;
    scope: string[];
}

export interface IOAuthAuthorizationCode {
    code: string;
    expiresAt: Date;
}

/**
 * OAuth2 Authorization Server
 * Implements RFC 6749 compliant OAuth2 server
 */
export class OAuth2Service {
    private pool: Pool;
    private readonly ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // 15 minutes
    private readonly REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days
    private readonly AUTHORIZATION_CODE_EXPIRES_IN = 10 * 60; // 10 minutes

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Register OAuth client
     */
    async registerClient(clientData: {
        clientName: string;
        redirectUris: string[];
        grants: string[];
        tenantId?: string;
        isTrusted?: boolean;
    }): Promise<IOAuthClient> {
        try {
            const clientId = this.generateClientId();
            const clientSecret = this.generateClientSecret();
            const clientSecretHash = await bcrypt.hash(clientSecret, 10);

            const result = await this.pool.query(
                `INSERT INTO oauth_clients (
          client_id, client_secret, client_name, redirect_uris, grants, tenant_id, is_trusted
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, client_id, client_name, redirect_uris, grants, tenant_id, is_trusted`,
                [
                    clientId,
                    clientSecretHash,
                    clientData.clientName,
                    clientData.redirectUris,
                    clientData.grants,
                    clientData.tenantId || null,
                    clientData.isTrusted || false,
                ]
            );

            logger.info('OAuth client registered', {
                clientId,
                clientName: clientData.clientName,
            });

            return {
                ...result.rows[0],
                clientSecret, // Return plain secret only once
            };
        } catch (error) {
            logger.error('Failed to register OAuth client', { error });
            throw error;
        }
    }

    /**
     * Validate client credentials
     */
    async validateClient(clientId: string, clientSecret: string): Promise<IOAuthClient | null> {
        try {
            const result = await this.pool.query(
                `SELECT id, client_id, client_secret, client_name, redirect_uris, grants, tenant_id, is_trusted
         FROM oauth_clients WHERE client_id = $1`,
                [clientId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const client = result.rows[0];
            const secretValid = await bcrypt.compare(clientSecret, client.client_secret);

            if (!secretValid) {
                logger.warn('Invalid client secret', { clientId });
                return null;
            }

            // Remove secret from response
            delete client.client_secret;

            return client;
        } catch (error) {
            logger.error('Failed to validate client', { error, clientId });
            throw error;
        }
    }

    /**
     * Generate authorization code
     */
    async generateAuthorizationCode(
        clientId: string,
        userId: string,
        redirectUri: string,
        scope: string[]
    ): Promise<IOAuthAuthorizationCode> {
        try {
            // Validate client
            const clientResult = await this.pool.query(
                'SELECT id, redirect_uris FROM oauth_clients WHERE client_id = $1',
                [clientId]
            );

            if (clientResult.rows.length === 0) {
                throw new ValidationError('Invalid client');
            }

            const client = clientResult.rows[0];

            // Validate redirect URI
            if (!client.redirect_uris.includes(redirectUri)) {
                throw new ValidationError('Invalid redirect URI');
            }

            // Generate code
            const code = this.generateRandomToken(32);
            const expiresAt = new Date(Date.now() + this.AUTHORIZATION_CODE_EXPIRES_IN * 1000);

            await this.pool.query(
                `INSERT INTO oauth_authorization_codes (code, client_id, user_id, redirect_uri, expires_at, scope)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [code, client.id, userId, redirectUri, expiresAt, scope]
            );

            logger.info('Authorization code generated', { clientId, userId });

            return { code, expiresAt };
        } catch (error) {
            logger.error('Failed to generate authorization code', { error, clientId, userId });
            throw error;
        }
    }

    /**
     * Exchange authorization code for tokens
     */
    async exchangeAuthorizationCode(
        clientId: string,
        clientSecret: string,
        code: string,
        redirectUri: string
    ): Promise<IOAuthToken> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Validate client
            const validClient = await this.validateClient(clientId, clientSecret);
            if (!validClient) {
                throw new ValidationError('Invalid client credentials');
            }

            // Get and validate authorization code
            const codeResult = await client.query(
                `SELECT oc.id, oc.user_id, oc.redirect_uri, oc.scope, oc.expires_at, c.id as client_id
         FROM oauth_authorization_codes oc
         JOIN oauth_clients c ON oc.client_id = c.id
         WHERE oc.code = $1 AND c.client_id = $2`,
                [code, clientId]
            );

            if (codeResult.rows.length === 0) {
                throw new ValidationError('Invalid authorization code');
            }

            const authCode = codeResult.rows[0];

            // Check expiration
            if (new Date() > new Date(authCode.expires_at)) {
                throw new ValidationError('Authorization code expired');
            }

            // Validate redirect URI
            if (authCode.redirect_uri !== redirectUri) {
                throw new ValidationError('Redirect URI mismatch');
            }

            // Delete the authorization code (one-time use)
            await client.query(
                'DELETE FROM oauth_authorization_codes WHERE id = $1',
                [authCode.id]
            );

            // Generate tokens
            const tokens = await this.generateTokens(
                authCode.client_id,
                authCode.user_id,
                authCode.scope,
                client
            );

            await client.query('COMMIT');

            logger.info('Authorization code exchanged', {
                clientId,
                userId: authCode.user_id,
            });

            return tokens;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to exchange authorization code', { error, clientId });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Generate tokens (access + refresh)
     */
    async generateTokens(
        clientDbId: string,
        userId: string,
        scope: string[],
        dbClient?: any
    ): Promise<IOAuthToken> {
        const queryClient = dbClient || this.pool;

        const accessToken = this.generateRandomToken(64);
        const refreshToken = this.generateRandomToken(64);
        const expiresAt = new Date(Date.now() + this.ACCESS_TOKEN_EXPIRES_IN * 1000);
        const refreshExpiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_IN * 1000);

        await queryClient.query(
            `INSERT INTO oauth_tokens (access_token, refresh_token, client_id, user_id, expires_at, refresh_expires_at, scope)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [accessToken, refreshToken, clientDbId, userId, expiresAt, refreshExpiresAt, scope]
        );

        return {
            accessToken,
            refreshToken,
            expiresAt,
            refreshExpiresAt,
            scope,
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(
        clientId: string,
        clientSecret: string,
        refreshToken: string
    ): Promise<IOAuthToken> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Validate client
            const validClient = await this.validateClient(clientId, clientSecret);
            if (!validClient) {
                throw new ValidationError('Invalid client credentials');
            }

            // Get token info
            const tokenResult = await client.query(
                `SELECT t.id, t.user_id, t.scope, t.refresh_expires_at, c.id as client_id
         FROM oauth_tokens t
         JOIN oauth_clients c ON t.client_id = c.id
         WHERE t.refresh_token = $1 AND c.client_id = $2`,
                [refreshToken, clientId]
            );

            if (tokenResult.rows.length === 0) {
                throw new ValidationError('Invalid refresh token');
            }

            const tokenData = tokenResult.rows[0];

            // Check expiration
            if (new Date() > new Date(tokenData.refresh_expires_at)) {
                throw new ValidationError('Refresh token expired');
            }

            // Delete old tokens
            await client.query('DELETE FROM oauth_tokens WHERE id = $1', [tokenData.id]);

            // Generate new tokens
            const newTokens = await this.generateTokens(
                tokenData.client_id,
                tokenData.user_id,
                tokenData.scope,
                client
            );

            await client.query('COMMIT');

            logger.info('Token refreshed', {
                clientId,
                userId: tokenData.user_id,
            });

            return newTokens;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to refresh token', { error, clientId });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Validate access token
     */
    async validateAccessToken(accessToken: string): Promise<{
        userId: string;
        clientId: string;
        scope: string[];
        tenantId?: string;
    } | null> {
        try {
            const result = await this.pool.query(
                `SELECT t.user_id, t.scope, t.expires_at, c.client_id, c.tenant_id
         FROM oauth_tokens t
         JOIN oauth_clients c ON t.client_id = c.id
         WHERE t.access_token = $1`,
                [accessToken]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const token = result.rows[0];

            // Check expiration
            if (new Date() > new Date(token.expires_at)) {
                logger.warn('Access token expired', { accessToken: accessToken.substring(0, 10) + '...' });
                return null;
            }

            return {
                userId: token.user_id,
                clientId: token.client_id,
                scope: token.scope,
                tenantId: token.tenant_id,
            };
        } catch (error) {
            logger.error('Failed to validate access token', { error });
            throw error;
        }
    }

    /**
     * Revoke token
     */
    async revokeToken(token: string): Promise<void> {
        try {
            await this.pool.query(
                'DELETE FROM oauth_tokens WHERE access_token = $1 OR refresh_token = $1',
                [token]
            );

            logger.info('Token revoked');
        } catch (error) {
            logger.error('Failed to revoke token', { error });
            throw error;
        }
    }

    /**
     * Cleanup expired tokens and codes
     */
    async cleanupExpired(): Promise<{
        tokensDeleted: number;
        codesDeleted: number;
    }> {
        try {
            const tokensResult = await this.pool.query(
                'DELETE FROM oauth_tokens WHERE expires_at < CURRENT_TIMESTAMP'
            );

            const codesResult = await this.pool.query(
                'DELETE FROM oauth_authorization_codes WHERE expires_at < CURRENT_TIMESTAMP'
            );

            logger.info('Expired tokens and codes cleaned up', {
                tokensDeleted: tokensResult.rowCount,
                codesDeleted: codesResult.rowCount,
            });

            return {
                tokensDeleted: tokensResult.rowCount || 0,
                codesDeleted: codesResult.rowCount || 0,
            };
        } catch (error) {
            logger.error('Failed to cleanup expired tokens', { error });
            throw error;
        }
    }

    /**
     * Generate client ID
     */
    private generateClientId(): string {
        return `client_${crypto.randomBytes(16).toString('hex')}`;
    }

    /**
     * Generate client secret
     */
    private generateClientSecret(): string {
        return crypto.randomBytes(32).toString('base64');
    }

    /**
     * Generate random token
     */
    private generateRandomToken(length: number): string {
        return crypto.randomBytes(length).toString('base64url');
    }
}

export const oauth2Service = new OAuth2Service();
