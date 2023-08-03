const config = {
  roots: [
    '<rootDir>/build'
  ],
  testMatch: [
    '**/__tests__/**/*.+(ts|js)',
    '**/?(*.)+(spec|test).+(ts|js)'
  ],
  transform: {
    '^.+\\.(ts)$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js'],
};

export default config;