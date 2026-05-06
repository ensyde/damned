/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js"],
  moduleNameMapper: {
    "^@damned/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
};
