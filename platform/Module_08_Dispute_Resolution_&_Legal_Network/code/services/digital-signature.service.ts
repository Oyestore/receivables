import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum SignatureStatus {
    PENDING = 'PENDING',
    SIGNED = 'SIGNED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED'
}

export interface SigningRequest {
    documentId: string;
    signerName: string;
    signerEmail: string;
    reason: string;
}

export interface SigningResponse {
    requestId: string;
    status: SignatureStatus;
    signingUrl: string;
    expiresAt: Date;
}

@Injectable()
export class DigitalSignatureService {
    private readonly logger = new Logger(DigitalSignatureService.name);
    private readonly isSimulation: boolean;

    constructor(private configService: ConfigService) {
        this.isSimulation = this.configService.get('DIGITAL_SIGNATURE_PROVIDER') === 'SIMULATION' || true;
    }

    /**
     * Initiate a signing workflow for a document
     */
    async initiateSigningRequest(request: SigningRequest): Promise<SigningResponse> {
        this.logger.log(`Initiating signing request for document ${request.documentId} by ${request.signerEmail}`);

        if (this.isSimulation) {
            return this.simulateSigningRequest(request);
        }

        // Real implementation would call Leegality/DocuSign API here
        throw new Error('Real Digital Signature Provider not configured');
    }

    /**
     * Check status of a signing request
     */
    async checkSigningStatus(requestId: string): Promise<SignatureStatus> {
        // In a real scenario, this would poll the provider or check a webhook status in DB
        // For simulation, we randomly return SIGNED or PENDING based on ID hash
        const lastChar = requestId.slice(-1);
        if (['0', '1', '2'].includes(lastChar)) return SignatureStatus.PENDING;
        if (['3', '4', '5', '6', '7', '8', '9'].includes(lastChar)) return SignatureStatus.SIGNED;

        return SignatureStatus.PENDING;
    }

    /**
     * Apply digital signature to PDF (Simulated Stamping)
     * In reality, this would download the signed PDF from the provider
     */
    async getSignedDocument(requestId: string): Promise<Buffer> {
        this.logger.log(`Retrieving signed document for request ${requestId}`);
        // Return a dummy buffer representing the signed PDF
        return Buffer.from(`%PDF-1.5 %Signed version of request ${requestId}`);
    }

    private simulateSigningRequest(request: SigningRequest): SigningResponse {
        const requestId = `SIGN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        return {
            requestId,
            status: SignatureStatus.PENDING,
            signingUrl: `https://platform.sme.b2b/sign/${requestId}?token=simulated_token`,
            expiresAt
        };
    }
}
