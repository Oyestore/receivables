module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/code'],
    testMatch: ['**/__tests__/**/*.spec.ts', '**/*.spec.ts'],
    collectCoverageFrom: [
        'code/**/*.ts',
        '!code/**/*.spec.ts',
        '!code/**/index.ts',
        '!code/**/*.entity.ts',
        '!code/**/*.dto.ts',
        '!code/**/*.interface.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 75,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/code/$1',
    },
    coverageDirectory: './coverage',
    verbose: true,
    testTimeout: 10000,
};
