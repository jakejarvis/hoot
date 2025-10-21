CREATE TABLE "http_headers_meta" (
	"domain_id" uuid PRIMARY KEY NOT NULL,
	"final_url" text,
	"status" integer,
	"fetched_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ck_http_meta_status_code" CHECK ("http_headers_meta"."status" IS NULL OR ("http_headers_meta"."status" BETWEEN 100 AND 599)),
	CONSTRAINT "ck_http_meta_valid_window" CHECK ("http_headers_meta"."expires_at" >= "http_headers_meta"."fetched_at")
);
--> statement-breakpoint
ALTER TABLE "http_headers_meta" ADD CONSTRAINT "http_headers_meta_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "i_http_meta_expires" ON "http_headers_meta" USING btree ("expires_at");