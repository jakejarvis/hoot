ALTER TABLE "dns_records" DROP CONSTRAINT "u_dns_record";--> statement-breakpoint
ALTER TABLE "dns_records" ADD CONSTRAINT "u_dns_record" UNIQUE("domain_id","type","name","value","priority");