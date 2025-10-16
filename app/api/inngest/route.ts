import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [],
});
