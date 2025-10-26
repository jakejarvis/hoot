CREATE TYPE "public"."verification_method" AS ENUM('dns', 'meta', 'file');--> statement-breakpoint
CREATE TABLE "user_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"domain_id" uuid NOT NULL,
	"verification_token" text,
	"verification_method" "verification_method",
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_domains_verification_token_unique" UNIQUE("verification_token"),
	CONSTRAINT "u_user_domains_user_domain" UNIQUE("user_id","domain_id")
);
--> statement-breakpoint
ALTER TABLE "user_domains" ADD CONSTRAINT "user_domains_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_domains" ADD CONSTRAINT "user_domains_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "i_user_domains_user" ON "user_domains" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "i_user_domains_verified" ON "user_domains" USING btree ("verified_at");