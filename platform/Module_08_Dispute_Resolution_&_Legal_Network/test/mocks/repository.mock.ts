export function createMockRepository() {
    return {
        find: jest.fn(),
        findOne: jest.fn(),
        findOneBy: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        create: jest.fn((entity) => entity),
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
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
        })),
    };
}

export function createMockService() {
    return {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
}
