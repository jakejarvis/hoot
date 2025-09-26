// Mock for Redis cache operations
export const mockRedisCache = {
  get: vi.fn(),
  set: vi.fn(),
  getOrSet: vi.fn(),
  ns: vi.fn((prefix: string, key: string) => `${prefix}:${key}`),
};

// Mock implementation for @/lib/redis
vi.mock("@/lib/redis", () => ({
  getFromCache: mockRedisCache.get,
  setInCache: mockRedisCache.set,
  getOrSet: mockRedisCache.getOrSet,
  ns: mockRedisCache.ns,
}));

export const resetRedisMocks = () => {
  vi.clearAllMocks();
  mockRedisCache.get.mockReset();
  mockRedisCache.set.mockReset();
  mockRedisCache.getOrSet.mockReset();
  mockRedisCache.ns.mockImplementation((prefix: string, key: string) => `${prefix}:${key}`);
};