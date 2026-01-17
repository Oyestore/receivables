"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const virtual_account_service_1 = require("./Module_03_Payment_Integration/src/services/virtual-account.service");
// Removed UPI imports
// Mock Repository
const mockRepo = {
    create: (dto) => ({ ...dto, id: 'mock-id', createdAt: new Date(), updatedAt: new Date() }),
    save: (entity) => Promise.resolve({ ...entity, id: 'mock-id' }),
    findOne: () => Promise.resolve(null),
    update: () => Promise.resolve({ affected: 1 }),
};
async function verify() {
    console.log('--- TARGETED VERIFICATION: Module 03 (Virtual Accounts) ---');
    // 2. Virtual Account Service (Repo dependency)
    try {
        console.log('\n2. Testing VirtualAccountService...');
        // Manually instantiate to avoid NestJS DI overhead/issues for this simple check
        const vaService = new virtual_account_service_1.VirtualAccountService(mockRepo);
        const va = await vaService.createVirtualAccount('CUST_001', 'INV_999');
        console.log('   Virtual Account Created:', va.virtualAccountNumber);
        if (va.virtualAccountNumber.startsWith('SME')) {
            console.log('   ✅ VA Creation Logic Passed');
        }
        else {
            console.error('   ❌ VA Creation Logic Failed');
        }
    }
    catch (e) {
        console.error('   ❌ VA Service Error:', e.message);
    }
    console.log('\n--- VERIFICATION COMPLETE ---');
}
verify();
//# sourceMappingURL=verify-module03-standalone.js.map