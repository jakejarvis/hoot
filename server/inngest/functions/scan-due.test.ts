import { beforeEach, describe, expect, it, vi } from "vitest";

describe("scan-due", () => {
  beforeEach(async () => {
    vi.resetModules();
    const { makePGliteDb } = await import("@/server/db/pglite");
    const { db } = await makePGliteDb();
    vi.doMock("@/server/db/client", () => ({ db }));
    globalThis.__redisTestHelper.reset();
  });

  it("counts due dns rows via db mock", async () => {
    const { countDueDns } = await import("@/server/inngest/functions/scan-due");
    const n = await countDueDns(new Date());
    expect(typeof n).toBe("number");
  });
});
