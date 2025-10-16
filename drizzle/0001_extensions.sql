-- Enable pg_trgm extension for trigram indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for providers.name
CREATE INDEX IF NOT EXISTS i_providers_name_trgm ON providers USING gin (name gin_trgm_ops);

-- Functional/partial uniques not supported by builder - apply via raw SQL
DO $$ BEGIN
  -- unique on (category, lower(name))
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'u_prov_cat_name'
  ) THEN
    CREATE UNIQUE INDEX u_prov_cat_name ON providers (category, lower(name));
  END IF;

  -- partial unique (category, domain) where domain is not null
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'u_prov_cat_domain'
  ) THEN
    CREATE UNIQUE INDEX u_prov_cat_domain ON providers(category, domain) WHERE domain IS NOT NULL;
  END IF;
END $$;

-- provider_aliases unique (provider_id, lower(alias))
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'u_provider_alias'
  ) THEN
    CREATE UNIQUE INDEX u_provider_alias ON provider_aliases (provider_id, lower(alias));
  END IF;
END $$;

-- domains trigram on name
CREATE INDEX IF NOT EXISTS i_domains_name_trgm ON domains USING gin (name gin_trgm_ops);

-- certificates alt_names GIN
CREATE INDEX IF NOT EXISTS i_certs_alt_names ON certificates USING gin (alt_names);


