import "@testing-library/jest-dom";

// Set NODE_ENV for test environment
process.env.NODE_ENV = "test";

// Mock console to reduce noise in tests if needed
// You can uncomment these lines if you want to suppress console logs during tests
// global.console = {
//   ...console,
//   log: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };