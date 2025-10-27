CREATE TABLE "domain_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"snapshot_type" text NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"domain_id" uuid NOT NULL,
	"notification_type" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"notify_registration_expiring" boolean DEFAULT true NOT NULL,
	"notify_certificate_expiring" boolean DEFAULT true NOT NULL,
	"registration_expiry_days" integer[] DEFAULT ARRAY[30, 14, 7, 1] NOT NULL,
	"certificate_expiry_days" integer[] DEFAULT ARRAY[30, 14, 7, 1] NOT NULL,
	"notify_nameserver_change" boolean DEFAULT true NOT NULL,
	"notify_certificate_change" boolean DEFAULT true NOT NULL,
	"notify_dns_change" boolean DEFAULT false NOT NULL,
	"notify_hosting_change" boolean DEFAULT true NOT NULL,
	"notify_resolution_failure" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "domain_snapshots" ADD CONSTRAINT "domain_snapshots_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "i_domain_snapshots_domain" ON "domain_snapshots" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "i_domain_snapshots_type" ON "domain_snapshots" USING btree ("snapshot_type");--> statement-breakpoint
CREATE INDEX "i_domain_snapshots_created_at" ON "domain_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "i_notification_log_user" ON "notification_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "i_notification_log_domain" ON "notification_log" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "i_notification_log_sent_at" ON "notification_log" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "i_notification_log_type" ON "notification_log" USING btree ("notification_type");