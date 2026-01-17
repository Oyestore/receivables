import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Test setup utilities for Module 13
 */

// Global test timeout
jest.setTimeout(30000);

/**
 * Create mock repository for TypeORM entities
 */
export function createMockRepository<T>(): Partial<Repository<T>> {
    return {
        find: jest.fn(),
        findOne: jest.fn(),
        findOneBy: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
            getOne: jest.fn(),
            getCount: jest.fn(),
            execute: jest.fn(),
        })),
    };
}

/**
 * Get repository token helper
 */
export function getRepositoryTokenFor(entity: any) {
    return getRepositoryToken(entity);
}

/**
 * Clean up after tests
 */
afterEach(() => {
    jest.clearAllMocks();
});
