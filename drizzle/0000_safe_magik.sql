CREATE TYPE "public"."contact_type" AS ENUM('registrant', 'admin', 'tech', 'billing', 'abuse', 'registrar', 'reseller', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."dns_resolver" AS ENUM('cloudflare', 'google');--> statement-breakpoint
CREATE TYPE "public"."dns_type" AS ENUM('A', 'AAAA', 'MX', 'TXT', 'NS');--> statement-breakpoint
CREATE TYPE "public"."provider_category" AS ENUM('hosting', 'email', 'dns', 'ca', 'registrar');--> statement-breakpoint
CREATE TYPE "public"."domain_relation" AS ENUM('dns_ns', 'dns_mx', 'cert_san', 'seo_canonical', 'registrar', 'hosting', 'email', 'dns');--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"alt_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone NOT NULL,
	"ca_provider_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dns_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"type" "dns_type" NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"ttl" integer,
	"priority" integer,
	"is_cloudflare" boolean,
	"resolver" "dns_resolver" NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"src_domain_id" uuid NOT NULL,
	"relation" "domain_relation" NOT NULL,
	"dst_domain_id" uuid,
	"dst_provider_id" uuid,
	"to_value" text NOT NULL,
	"evidence" jsonb,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tld" text NOT NULL,
	"punycode_name" text,
	"unicode_name" text,
	"is_idn" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hosting" (
	"domain_id" uuid PRIMARY KEY NOT NULL,
	"hosting_provider_id" uuid NOT NULL,
	"email_provider_id" uuid NOT NULL,
	"dns_provider_id" uuid NOT NULL,
	"geo_city" text NOT NULL,
	"geo_region" text NOT NULL,
	"geo_country" text NOT NULL,
	"geo_country_code" text NOT NULL,
	"geo_lat" integer,
	"geo_lon" integer,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "http_headers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"alias" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "provider_category" NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_nameservers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"host" text NOT NULL,
	"ipv4" jsonb,
	"ipv6" jsonb
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"domain_id" uuid PRIMARY KEY NOT NULL,
	"is_registered" boolean NOT NULL,
	"registry" text,
	"creation_date" timestamp with time zone,
	"updated_date" timestamp with time zone,
	"expiration_date" timestamp with time zone,
	"deletion_date" timestamp with time zone,
	"transfer_lock" boolean,
	"statuses" jsonb,
	"contacts" jsonb,
	"whois_server" text,
	"rdap_servers" jsonb,
	"source" text NOT NULL,
	"registrar_provider_id" uuid,
	"reseller_provider_id" uuid,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo" (
	"domain_id" uuid PRIMARY KEY NOT NULL,
	"source_final_url" text,
	"source_status" integer,
	"meta_open_graph" jsonb,
	"meta_twitter" jsonb,
	"meta_general" jsonb,
	"preview_title" text,
	"preview_description" text,
	"preview_image_url" text,
	"preview_image_uploaded_url" text,
	"canonical_url" text,
	"robots" jsonb,
	"robots_sitemaps" jsonb,
	"errors" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_ca_provider_id_providers_id_fk" FOREIGN KEY ("ca_provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dns_records" ADD CONSTRAINT "dns_records_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_edges" ADD CONSTRAINT "domain_edges_src_domain_id_domains_id_fk" FOREIGN KEY ("src_domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_edges" ADD CONSTRAINT "domain_edges_dst_domain_id_domains_id_fk" FOREIGN KEY ("dst_domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_edges" ADD CONSTRAINT "domain_edges_dst_provider_id_providers_id_fk" FOREIGN KEY ("dst_provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hosting" ADD CONSTRAINT "hosting_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hosting" ADD CONSTRAINT "hosting_hosting_provider_id_providers_id_fk" FOREIGN KEY ("hosting_provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hosting" ADD CONSTRAINT "hosting_email_provider_id_providers_id_fk" FOREIGN KEY ("email_provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hosting" ADD CONSTRAINT "hosting_dns_provider_id_providers_id_fk" FOREIGN KEY ("dns_provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "http_headers" ADD CONSTRAINT "http_headers_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_aliases" ADD CONSTRAINT "provider_aliases_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_nameservers" ADD CONSTRAINT "registration_nameservers_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_registrar_provider_id_providers_id_fk" FOREIGN KEY ("registrar_provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_reseller_provider_id_providers_id_fk" FOREIGN KEY ("reseller_provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo" ADD CONSTRAINT "seo_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certs_domain_idx" ON "certificates" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "certs_valid_to_idx" ON "certificates" USING btree ("valid_to");--> statement-breakpoint
CREATE INDEX "certs_alt_names_gin" ON "certificates" USING gin ("alt_names");--> statement-breakpoint
CREATE INDEX "dns_domain_type_idx" ON "dns_records" USING btree ("domain_id","type");--> statement-breakpoint
CREATE INDEX "dns_type_value_idx" ON "dns_records" USING btree ("type","value");--> statement-breakpoint
CREATE UNIQUE INDEX "dns_unique_record" ON "dns_records" USING btree ("domain_id","type","name","value");--> statement-breakpoint
CREATE INDEX "edges_src_idx" ON "domain_edges" USING btree ("src_domain_id");--> statement-breakpoint
CREATE INDEX "edges_dst_idx" ON "domain_edges" USING btree ("dst_domain_id");--> statement-breakpoint
CREATE INDEX "edges_dst_provider_idx" ON "domain_edges" USING btree ("dst_provider_id");--> statement-breakpoint
CREATE INDEX "edges_rel_idx" ON "domain_edges" USING btree ("relation");--> statement-breakpoint
CREATE INDEX "edges_value_idx" ON "domain_edges" USING btree ("to_value");--> statement-breakpoint
CREATE UNIQUE INDEX "edges_unique" ON "domain_edges" USING btree ("src_domain_id","relation","to_value");--> statement-breakpoint
CREATE UNIQUE INDEX "domains_name_unique" ON "domains" USING btree ("name");--> statement-breakpoint
CREATE INDEX "domains_name_trgm" ON "domains" USING gin ((name gin_trgm_ops));--> statement-breakpoint
CREATE INDEX "domains_tld_idx" ON "domains" USING btree ("tld");--> statement-breakpoint
CREATE INDEX "hosting_providers_idx" ON "hosting" USING btree ("hosting_provider_id","email_provider_id","dns_provider_id");--> statement-breakpoint
CREATE INDEX "headers_domain_idx" ON "http_headers" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "headers_name_idx" ON "http_headers" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "headers_unique_name" ON "http_headers" USING btree ("domain_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_alias_unique" ON "provider_aliases" USING btree ("provider_id",lower("alias"));--> statement-breakpoint
CREATE UNIQUE INDEX "providers_unique_domain" ON "providers" USING btree ("category","domain") WHERE "providers"."domain" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "providers_unique_name_lower" ON "providers" USING btree ("category",lower("name"));--> statement-breakpoint
CREATE INDEX "providers_name_trgm" ON "providers" USING gin ((name gin_trgm_ops));--> statement-breakpoint
CREATE INDEX "reg_ns_domain_idx" ON "registration_nameservers" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "reg_ns_host_idx" ON "registration_nameservers" USING btree ("host");--> statement-breakpoint
CREATE UNIQUE INDEX "reg_ns_unique" ON "registration_nameservers" USING btree ("domain_id","host");--> statement-breakpoint
CREATE INDEX "registrations_registrar_idx" ON "registrations" USING btree ("registrar_provider_id");--> statement-breakpoint
CREATE INDEX "registrations_expires_idx" ON "registrations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "seo_final_url_idx" ON "seo" USING btree ("source_final_url");--> statement-breakpoint
CREATE INDEX "seo_canonical_idx" ON "seo" USING btree ("canonical_url");