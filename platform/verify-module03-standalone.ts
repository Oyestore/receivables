import { Test } from '@nestjs/testing';
import { VirtualAccountService } from './Module_03_Payment_Integration/src/services/virtual-account.service';
import { VirtualAccount } from './Module_03_Payment_Integration/src/entities/virtual-account.entity';
// Removed UPI imports

// Mock Repository
const mockRepo = {
    create: (dto) => ({ ...dto, id: 'mock-id', createdAt: new Date(), updatedAt: new Date() }),
    save: (entity) => Promise.resolve({ ...entity, id: 'mock-id' }),
    findOne: () => Promise.resolve(null),
    update: () => Promise.resolve({ affected: 1 }),
};

import { SMSPaymentService } from './Module_03_Payment_Integration/src/services/sms-payment.service';
import { EventEmitter2 } from 'eventemitter2'; // Direct import or mock

// Mock EventEmitter compatible with NestJS EventEmitter2 signature
class MockEventEmitter {
    emit(event: string, payload: any) {
        console.log(`   [MockEmit] Event: ${event}`, payload);
        return true;
    }
}

async function verify() {
    console.log('--- TARGETED VERIFICATION: Module 03 (Virtual Accounts & SMS) ---');

    // 2. Virtual Account Service (Repo dependency)
    try {
        console.log('\n2. Testing VirtualAccountService...');
        const vaService = new VirtualAccountService(mockRepo as any);
        const va = await vaService.createVirtualAccount('CUST_001', 'INV_999');
        console.log('   Virtual Account Created:', va.virtualAccountNumber);
        if (va.virtualAccountNumber.startsWith('SME')) console.log('   ✅ VA Creation Logic Passed');
    } catch (e) {
        console.error('   ❌ VA Service Error:', e.message);
    }

    // 3. SMS Payment Service (Event Driven)
    try {
        console.log('\n3. Testing SMSPaymentService (Event Driven)...');
        const mockEmitter = new MockEventEmitter();
        const smsService = new SMSPaymentService(mockEmitter as any);

        const result = await smsService.sendPaymentLink('+919999999999', 'INV_123', 5000, 'http://pay.me/123');

        if (result) {
            console.log('   ✅ SMS Delegation Logic Passed');
        } else {
            console.error('   ❌ SMS Delegation Logic Failed');
        }
    } catch (e) {
        console.error('   ❌ SMS Service Error:', e.message);
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
}

verify();
