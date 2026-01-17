// Test setup file
import { Pool } from 'pg';

// Mock database service
jest.mock('../../Module_11_Common/code/database/database.service', () => ({
    databaseService: {
        getPool: jest.fn(() => ({
            connect: jest.fn(),
            query: jest.fn(),
            end: jest.fn(),
        })),
        connect: jest.fn(),
        disconnect: jest.fn(),
    },
}));

// Mock logger
jest.mock('../../Module_11_Common/code/logging/logger', () => ({
    Logger: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    })),
}));

// Global test utilities
global.mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
};

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});
