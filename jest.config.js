export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/jest.setup.ts'],
  injectGlobals: true,
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/tools/**/*.ts',
    'src/constants/**/*.ts',
    '!src/utils/**/__tests__/**',
    '!src/tools/**/__tests__/**',
    '!src/utils/**/index.ts',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2022',
          target: 'ES2022',
          moduleResolution: 'bundler',
          isolatedModules: true,
        },
      },
    ],
  },
};
