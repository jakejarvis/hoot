import { sql } from 'drizzle-orm';
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Enums
export const providerCategoryEnum = pgEnum('provider_category', [
  'hosting',
  'email',
  'dns',
  'ca',
  'registrar',
]);

export const dnsTypeEnum = pgEnum('dns_type', ['A', 'AAAA', 'MX', 'TXT', 'NS']);
export const dnsResolverEnum = pgEnum('dns_resolver', ['cloudflare', 'google']);
export const contactTypeEnum = pgEnum('contact_type', [
  'registrant',
  'admin',
  'tech',
  'billing',
  'abuse',
  'registrar',
  'reseller',
  'unknown',
]);
export const relationEnum = pgEnum('domain_relation', [
  'dns_ns',
  'dns_mx',
  'cert_san',
  'seo_canonical',
  'registrar',
  'hosting',
  'email',
  'dns',
]);

// Providers
export const providers = pgTable(
  'providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category: providerCategoryEnum('category').notNull(),
    name: text('name').notNull(),
    domain: text('domain'),
    slug: text('slug').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqByDomain: uniqueIndex('providers_unique_domain')
      .on(t.category, t.domain)
      .where(sql`${t.domain} IS NOT NULL`),
    uniqByName: uniqueIndex('providers_unique_name_lower').on(
      t.category,
      // drizzle requires SQL here for lower(name)
      sql`lower(${t.name})`,
    ),
    nameTrgm: index('providers_name_trgm').using(
      'gin',
      sql`(name gin_trgm_ops)`,
    ),
  }),
);

export const providerAliases = pgTable(
  'provider_aliases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerId: uuid('provider_id')
      .references(() => providers.id, { onDelete: 'cascade' })
      .notNull(),
    alias: text('alias').notNull(),
  },
  (t) => ({
    uniq: uniqueIndex('provider_alias_unique').on(
      t.providerId,
      sql`lower(${t.alias})`,
    ),
  }),
);

// Domains
export const domains = pgTable(
  'domains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    tld: text('tld').notNull(),
    punycodeName: text('punycode_name'),
    unicodeName: text('unicode_name'),
    isIdn: boolean('is_idn').notNull().default(false),
    // Favicon (1:1)
    faviconUrl: text('favicon_url'),
    faviconKey: text('favicon_key'),
    faviconExpiresAt: timestamp('favicon_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nameUnique: uniqueIndex('domains_name_unique').on(t.name),
    nameTrgm: index('domains_name_trgm').using(
      'gin',
      sql`(name gin_trgm_ops)`,
    ),
    tldIdx: index('domains_tld_idx').on(t.tld),
  }),
);

// Registration snapshot
export const registrations = pgTable(
  'registrations',
  {
    domainId: uuid('domain_id')
      .primaryKey()
      .references(() => domains.id, { onDelete: 'cascade' }),
    isRegistered: boolean('is_registered').notNull(),
    registry: text('registry'),
    creationDate: timestamp('creation_date', { withTimezone: true }),
    updatedDate: timestamp('updated_date', { withTimezone: true }),
    expirationDate: timestamp('expiration_date', { withTimezone: true }),
    deletionDate: timestamp('deletion_date', { withTimezone: true }),
    transferLock: boolean('transfer_lock'),
    statuses: jsonb('statuses'),
    contacts: jsonb('contacts'),
    whoisServer: text('whois_server'),
    rdapServers: jsonb('rdap_servers'),
    source: text('source').notNull(),
    registrarProviderId: uuid('registrar_provider_id').references(
      () => providers.id,
    ),
    resellerProviderId: uuid('reseller_provider_id').references(
      () => providers.id,
    ),
    fetchedAt: timestamp('fetched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    registrarIdx: index('registrations_registrar_idx').on(
      t.registrarProviderId,
    ),
    expiresIdx: index('registrations_expires_idx').on(t.expiresAt),
  }),
);

export const registrationNameservers = pgTable(
  'registration_nameservers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id')
      .references(() => domains.id, { onDelete: 'cascade' })
      .notNull(),
    host: text('host').notNull(),
    ipv4: jsonb('ipv4'),
    ipv6: jsonb('ipv6'),
  },
  (t) => ({
    byDomain: index('reg_ns_domain_idx').on(t.domainId),
    hostIdx: index('reg_ns_host_idx').on(t.host),
    uniquePerHost: uniqueIndex('reg_ns_unique').on(t.domainId, t.host),
  }),
);

// DNS records
export const dnsRecords = pgTable(
  'dns_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id')
      .references(() => domains.id, { onDelete: 'cascade' })
      .notNull(),
    type: dnsTypeEnum('type').notNull(),
    name: text('name').notNull(),
    value: text('value').notNull(),
    ttl: integer('ttl'),
    priority: integer('priority'),
    isCloudflare: boolean('is_cloudflare'),
    resolver: dnsResolverEnum('resolver').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    byDomainType: index('dns_domain_type_idx').on(t.domainId, t.type),
    byTypeValue: index('dns_type_value_idx').on(t.type, t.value),
    aggregateUniq: uniqueIndex('dns_unique_record').on(
      t.domainId,
      t.type,
      t.name,
      t.value,
    ),
  }),
);

// Certificates
export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id')
      .references(() => domains.id, { onDelete: 'cascade' })
      .notNull(),
    issuer: text('issuer').notNull(),
    subject: text('subject').notNull(),
    altNames: jsonb('alt_names').notNull().default(sql`'[]'::jsonb`),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }).notNull(),
    caProviderId: uuid('ca_provider_id')
      .references(() => providers.id)
      .notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    byDomain: index('certs_domain_idx').on(t.domainId),
    byExpiry: index('certs_valid_to_idx').on(t.validTo),
    altNamesGin: index('certs_alt_names_gin').using('gin', sql`${t.altNames}`),
  }),
);

// HTTP headers
export const httpHeaders = pgTable(
  'http_headers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id')
      .references(() => domains.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    value: text('value').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    byDomain: index('headers_domain_idx').on(t.domainId),
    byName: index('headers_name_idx').on(t.name),
    uniquePerHeader: uniqueIndex('headers_unique_name').on(t.domainId, t.name),
  }),
);

// Hosting
export const hosting = pgTable(
  'hosting',
  {
    domainId: uuid('domain_id')
      .primaryKey()
      .references(() => domains.id, { onDelete: 'cascade' }),
    hostingProviderId: uuid('hosting_provider_id')
      .references(() => providers.id)
      .notNull(),
    emailProviderId: uuid('email_provider_id')
      .references(() => providers.id)
      .notNull(),
    dnsProviderId: uuid('dns_provider_id')
      .references(() => providers.id)
      .notNull(),
    geoCity: text('geo_city').notNull(),
    geoRegion: text('geo_region').notNull(),
    geoCountry: text('geo_country').notNull(),
    geoCountryCode: text('geo_country_code').notNull(),
    geoLat: integer('geo_lat'),
    geoLon: integer('geo_lon'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    providersIdx: index('hosting_providers_idx').on(
      t.hostingProviderId,
      t.emailProviderId,
      t.dnsProviderId,
    ),
  }),
);

// SEO
export const seo = pgTable(
  'seo',
  {
    domainId: uuid('domain_id')
      .primaryKey()
      .references(() => domains.id, { onDelete: 'cascade' }),
    sourceFinalUrl: text('source_final_url'),
    sourceStatus: integer('source_status'),
    metaOpenGraph: jsonb('meta_open_graph'),
    metaTwitter: jsonb('meta_twitter'),
    metaGeneral: jsonb('meta_general'),
    previewTitle: text('preview_title'),
    previewDescription: text('preview_description'),
    previewImageUrl: text('preview_image_url'),
    previewImageUploadedUrl: text('preview_image_uploaded_url'),
    canonicalUrl: text('canonical_url'),
    robots: jsonb('robots'),
    robotsSitemaps: jsonb('robots_sitemaps'),
    errors: jsonb('errors'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    finalUrlIdx: index('seo_final_url_idx').on(t.sourceFinalUrl),
    canonicalIdx: index('seo_canonical_idx').on(t.canonicalUrl),
  }),
);

// Screenshots / assets table for multiple variants
export const domainAssets = pgTable(
  'domain_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id')
      .references(() => domains.id, { onDelete: 'cascade' })
      .notNull(),
    kind: text('kind').notNull(), // 'screenshot' | 'social' | future variants
    variant: text('variant').notNull().default('default'), // e.g. 'default', 'dark'
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    url: text('url'),
    key: text('key'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byDomainKind: index('asset_domain_kind_idx').on(t.domainId, t.kind),
    uniqVariant: uniqueIndex('asset_unique_variant').on(
      t.domainId,
      t.kind,
      t.variant,
      t.width,
      t.height,
    ),
  }),
);

// Domain edges (optional)
export const domainEdges = pgTable(
  'domain_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    srcDomainId: uuid('src_domain_id')
      .references(() => domains.id, { onDelete: 'cascade' })
      .notNull(),
    relation: relationEnum('relation').notNull(),
    dstDomainId: uuid('dst_domain_id').references(() => domains.id, {
      onDelete: 'set null',
    }),
    dstProviderId: uuid('dst_provider_id').references(() => providers.id, {
      onDelete: 'set null',
    }),
    toValue: text('to_value').notNull(),
    evidence: jsonb('evidence'),
    observedAt: timestamp('observed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    bySrc: index('edges_src_idx').on(t.srcDomainId),
    byDst: index('edges_dst_idx').on(t.dstDomainId),
    byDstProv: index('edges_dst_provider_idx').on(t.dstProviderId),
    byRel: index('edges_rel_idx').on(t.relation),
    byValue: index('edges_value_idx').on(t.toValue),
    uniquePerEdge: uniqueIndex('edges_unique').on(
      t.srcDomainId,
      t.relation,
      t.toValue,
    ),
  }),
);
