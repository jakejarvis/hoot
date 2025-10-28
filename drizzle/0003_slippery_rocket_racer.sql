ALTER TABLE "dns_records" ALTER COLUMN "resolver" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."dns_resolver";