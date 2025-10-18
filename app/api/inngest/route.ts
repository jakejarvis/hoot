import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import { blobPrune } from "@/server/inngest/functions/blob-prune";
import { domainInspected } from "@/server/inngest/functions/domain-inspected";
import { scanDue } from "@/server/inngest/functions/scan-due";
import { sectionRevalidate } from "@/server/inngest/functions/section-revalidate";

// opt out of caching per Inngest docs
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sectionRevalidate, domainInspected, scanDue, blobPrune],
});
