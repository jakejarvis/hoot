import "server-only";
import { Inngest } from "inngest";

// Configure a logger for Inngest functions. Defaults to console in all envs.
// https://www.inngest.com/docs/guides/logging
const logger = console;

export const inngest = new Inngest({
  id: "domainstack",
  logger,
});
