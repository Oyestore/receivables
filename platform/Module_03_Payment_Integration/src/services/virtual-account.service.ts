import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualAccount, VirtualAccountStatus } from '../entities/virtual-account.entity';

@Injectable()
export class VirtualAccountService {
    private readonly logger = new Logger(VirtualAccountService.name);

    constructor(
        @InjectRepository(VirtualAccount)
        private readonly virtualAccountRepository: Repository<VirtualAccount>,
    ) { }

    /**
     * Create a new Virtual Account for a Customer Invoice
     */
    async createVirtualAccount(
        customerId: string,
        invoiceId: string,
        bankName: string = 'HDFC Bank'
    ): Promise<VirtualAccount> {
        // In a real scenario, call Bank API to generate/reserve a VA number
        const uniqueSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        const virtualAccountNumber = `SME${customerId.substring(0, 4).toUpperCase()}${uniqueSuffix}`;

        const account = this.virtualAccountRepository.create({
            virtualAccountNumber,
            ifscCode: 'HDFC0001234', // Mock IFSC
            bankName,
            customerId,
            invoiceId,
            status: VirtualAccountStatus.ACTIVE,
        });

        return this.virtualAccountRepository.save(account);
    }

    /**
     * Resolve an incoming payment to an invoice via Virtual Account
     */
    async resolvePayment(virtualAccountNumber: string): Promise<VirtualAccount | null> {
        return this.virtualAccountRepository.findOne({
            where: { virtualAccountNumber, status: VirtualAccountStatus.ACTIVE },
        });
    }

    async closeAccount(id: string): Promise<void> {
        await this.virtualAccountRepository.update(id, { status: VirtualAccountStatus.CLOSED });
    }
}
