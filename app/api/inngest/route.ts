import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { checkExpirations } from "@/lib/inngest/functions/check-expirations";
import { sectionRevalidate } from "@/lib/inngest/functions/section-revalidate";

// opt out of caching per Inngest docs
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sectionRevalidate, checkExpirations],
});
