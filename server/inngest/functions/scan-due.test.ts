import { beforeEach, describe, expect, it } from "vitest";
import { countDueDns } from "@/server/inngest/functions/scan-due";

describe("scan-due", () => {
  beforeEach(() => {
    globalThis.__redisTestHelper.reset();
  });

  it("counts due dns rows via db mock", async () => {
    const n = await countDueDns(new Date());
    expect(typeof n).toBe("number");
  });
});
