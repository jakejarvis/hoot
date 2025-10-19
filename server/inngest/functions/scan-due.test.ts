import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("scan-due", () => {
  const dbRef = vi.hoisted(() => ({ db: null as unknown }));

  beforeAll(async () => {
    const { makePGliteDb } = await import("@/server/db/pglite");
    const { db } = await makePGliteDb();
    dbRef.db = db;
    vi.doMock("@/server/db/client", () => ({ db }));
  });

  beforeEach(async () => {
    const { resetPGliteDb } = await import("@/server/db/pglite");
    await resetPGliteDb();
  });

  it("counts due dns rows via db mock", async () => {
    const { countDueDns } = await import("@/server/inngest/functions/scan-due");
    const n = await countDueDns(new Date());
    expect(typeof n).toBe("number");
  });
});
