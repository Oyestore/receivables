import { Injectable, Logger } from '@nestjs/common';
import { InvoiceService } from './invoice.service';

export interface VoiceCommandResult {
    intent: 'CREATE_INVOICE' | 'CHECK_STATUS' | 'UNKNOWN';
    data?: any;
    message: string;
}

@Injectable()
export class VoiceCommandService {
    private readonly logger = new Logger(VoiceCommandService.name);

    constructor(private readonly invoiceService: InvoiceService) { }

    /**
     * Process a transcribed voice command
     * Example: "Create an invoice for ABC Corp for 500 dollars"
     */
    async processCommand(commandText: string, userId: string): Promise<VoiceCommandResult> {
        this.logger.log(`Processing voice command: "${commandText}"`);

        const lowerCmd = commandText.toLowerCase();

        // 1. Intent Recognition (Simple Regex for now, can be upgraded to NL/AI)
        if (lowerCmd.includes('create invoice') || lowerCmd.includes('generate invoice')) {
            return this.handleCreateInvoiceIntent(lowerCmd, userId);
        } else if (lowerCmd.includes('status') || lowerCmd.includes('check invoice')) {
            return this.handleCheckStatusIntent(lowerCmd);
        }

        return {
            intent: 'UNKNOWN',
            message: "I didn't understand that command. Try 'Create invoice for [Client]'."
        };
    }

    private async handleCreateInvoiceIntent(text: string, userId: string): Promise<VoiceCommandResult> {
        // Basic extraction logic (MockAI)
        // "Create invoice for Acme Corp for 1000 USD"
        const clientMatch = text.match(/for (.+) for/);
        const amountMatch = text.match(/for (\d+)/);

        const clientName = clientMatch ? clientMatch[1].trim() : 'Unknown Client';
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

        // In a real app, we'd lookup ClientID by Name here.
        // For now, we return the parsed data for the frontend to confirm.

        return {
            intent: 'CREATE_INVOICE',
            data: {
                clientNameRaw: clientName,
                amount: amount,
                currency: 'USD' // default
            },
            message: `Ready to create invoice for ${clientName} with amount ${amount}. Confirm?`
        };
    }

    private async handleCheckStatusIntent(text: string): Promise<VoiceCommandResult> {
        return {
            intent: 'CHECK_STATUS',
            message: "Opening invoice dashboard..."
        };
    }
}
