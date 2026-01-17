module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'code',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    moduleNameMapper: {
        '.*enhanced-email.service$': '<rootDir>/../test/mocks/enhanced-email.service.mock.ts'
    },
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
};
