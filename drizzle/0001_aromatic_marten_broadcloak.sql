CREATE TABLE "domain_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"variant" text DEFAULT 'default' NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"url" text,
	"key" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "favicon_url" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "favicon_key" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "favicon_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "domain_assets" ADD CONSTRAINT "domain_assets_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_domain_kind_idx" ON "domain_assets" USING btree ("domain_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_unique_variant" ON "domain_assets" USING btree ("domain_id","kind","variant","width","height");