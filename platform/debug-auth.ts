import { Test, TestingModule } from '@nestjs/testing';
import { AdministrationModule } from './Module_12_Administration/src/administration.module';
import { AuthService } from './Module_12_Administration/src/services/auth.service';

/**
 * DEBUG SCRIPT
 * Run this with: npx ts-node platform/debug-auth.ts
 */
async function debug() {
    console.log('--- STARTING DEBUG INSTANTIATION ---');
    try {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AdministrationModule],
        }).compile();

        console.log('--- MODULE COMPILED SUCCESSFULLY ---');

        const authService = moduleFixture.get<AuthService>(AuthService);
        if (authService) {
            console.log('--- AUTH SERVICE RESOLVED ---');
        } else {
            console.error('--- AUTH SERVICE MISSING ---');
        }

    } catch (error) {
        console.error('--- INSTANTIATION ERROR ---');
        console.error(error);
    }
    console.log('--- END DEBUG ---');
}

debug();
