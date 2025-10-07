import { z } from "zod";

export const StorageKindSchema = z.enum(["favicon", "screenshot", "social"]);

export type StorageKind = z.infer<typeof StorageKindSchema>;
