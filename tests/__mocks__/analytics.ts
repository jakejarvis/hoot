// Mock for analytics/server
export const mockAnalytics = {
  captureServer: vi.fn(),
};

// Mock implementation for @/lib/analytics/server
vi.mock("@/lib/analytics/server", () => ({
  captureServer: mockAnalytics.captureServer,
}));

export const resetAnalyticsMocks = () => {
  mockAnalytics.captureServer.mockReset();
};