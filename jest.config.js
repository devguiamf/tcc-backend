module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: ['**/src/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '.*\\.vscode.*',
    '.*\\.cursor.*',
    '/dist/',
    '/coverage/',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
};

