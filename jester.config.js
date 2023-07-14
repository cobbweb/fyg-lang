/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  testEnvironment: "node",
  setupFilesAfterEnv: ["./tests/lib/toBeValidCode.js"],
};
