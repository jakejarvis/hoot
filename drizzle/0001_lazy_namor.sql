CREATE TYPE "public"."provider_source" AS ENUM('catalog', 'discovered');--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "source" "provider_source" DEFAULT 'discovered' NOT NULL;