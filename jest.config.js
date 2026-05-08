/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    // Resolve the @/* path alias defined in tsconfig.json
    "^@/(.*)$": "<rootDir>/$1",
    // Stub out server-only so it doesn't throw during Jest runs
    "^server-only$": "<rootDir>/__mocks__/server-only.ts",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          // Allow Jest to handle JSX
          jsx: "react-jsx",
          // Relax module resolution for tests
          module: "commonjs",
        },
      },
    ],
  },
  // Only collect coverage from our source, not from node_modules or tests
  collectCoverageFrom: [
    "lib/**/*.ts",
    "app/**/*.ts",
    "app/**/*.tsx",
    "components/**/*.tsx",
    "proxy.ts",
    "!**/*.d.ts",
  ],
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
  ],
};

module.exports = config;
