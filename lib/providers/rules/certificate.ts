import type { Provider } from "@/lib/schemas";

/**
 * Certificate Authorities registry. Matches against issuer strings.
 */
export const CA_PROVIDERS: Array<
  Omit<Provider, "category"> & { category: "ca" }
> = [
  {
    name: "Let's Encrypt",
    domain: "letsencrypt.org",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "let's encrypt" },
        { kind: "issuerIncludes", substr: "lets encrypt" },
        { kind: "issuerIncludes", substr: "isrg" },
        // https://letsencrypt.org/certificates/
        { kind: "issuerEquals", value: "e1" },
        { kind: "issuerEquals", value: "e2" },
        { kind: "issuerEquals", value: "e5" },
        { kind: "issuerEquals", value: "e6" },
        { kind: "issuerEquals", value: "e7" },
        { kind: "issuerEquals", value: "e8" },
        { kind: "issuerEquals", value: "e9" },
        { kind: "issuerEquals", value: "r3" },
        { kind: "issuerEquals", value: "r4" },
        { kind: "issuerEquals", value: "r10" },
        { kind: "issuerEquals", value: "r11" },
        { kind: "issuerEquals", value: "r12" },
        { kind: "issuerEquals", value: "r13" },
        { kind: "issuerEquals", value: "r14" },
        { kind: "issuerEquals", value: "ye1" },
        { kind: "issuerEquals", value: "ye2" },
        { kind: "issuerEquals", value: "ye3" },
        { kind: "issuerEquals", value: "yr1" },
        { kind: "issuerEquals", value: "yr2" },
        { kind: "issuerEquals", value: "yr3" },
      ],
    },
  },
  {
    name: "Google Trust Services",
    domain: "pki.goog",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "google trust services" },
        { kind: "issuerIncludes", substr: "gts" },
        // https://pki.goog/repository/
        { kind: "issuerEquals", value: "wr1" },
        { kind: "issuerEquals", value: "wr2" },
        { kind: "issuerEquals", value: "wr3" },
        { kind: "issuerEquals", value: "wr4" },
        { kind: "issuerEquals", value: "wr5" },
        { kind: "issuerEquals", value: "we1" },
        { kind: "issuerEquals", value: "we2" },
        { kind: "issuerEquals", value: "we3" },
        { kind: "issuerEquals", value: "we4" },
        { kind: "issuerEquals", value: "we5" },
      ],
    },
  },
  {
    name: "ZeroSSL",
    domain: "zerossl.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "zerossl" },
  },
  {
    name: "Thawte (DigiCert)",
    domain: "thawte.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "thawte" },
  },
  {
    name: "DigiCert",
    domain: "digicert.com",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "digicert" },
        { kind: "issuerIncludes", substr: "baltimore cybertrust" },
        { kind: "issuerIncludes", substr: "quovadis" },
      ],
    },
  },
  {
    name: "GoDaddy",
    domain: "godaddy.com",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "godaddy" },
        { kind: "issuerIncludes", substr: "go daddy" },
        { kind: "issuerIncludes", substr: "starfield" },
      ],
    },
  },
  {
    name: "Sectigo (Comodo)",
    domain: "sectigo.com",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "sectigo" },
        { kind: "issuerIncludes", substr: "comodo" },
        { kind: "issuerIncludes", substr: "usertrust" },
        { kind: "issuerIncludes", substr: "aaa" },
      ],
    },
  },
  {
    name: "GlobalSign",
    domain: "globalsign.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "globalsign" },
  },
  {
    name: "GeoTrust",
    domain: "geotrust.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "geotrust" },
  },
  {
    name: "Entrust",
    domain: "entrust.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "entrust" },
  },
  {
    name: "Amazon Trust Services",
    domain: "amazontrust.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "amazon" },
  },
  {
    name: "SSL.com",
    domain: "ssl.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "ssl.com" },
  },
  {
    name: "Buypass",
    domain: "buypass.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "buypass" },
  },
  {
    name: "Verisign",
    domain: "verisign.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "verisign" },
  },
  {
    name: "HARICA",
    domain: "harica.gr",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "harica" },
  },
  {
    name: "Actalis",
    domain: "actalis.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "actalis" },
  },
  {
    name: "TrustAsia",
    domain: "trustasia.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "trustasia" },
  },
  {
    name: "D-TRUST",
    domain: "d-trust.net",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "d-trust" },
  },
  {
    name: "TWCA",
    domain: "twca.com.tw",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "twca" },
        { kind: "issuerIncludes", substr: "taiwan-ca" },
      ],
    },
  },
  {
    name: "SwissSign",
    domain: "swisssign.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "swisssign" },
  },
  {
    name: "RapidSSL",
    domain: "rapidssl.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "rapidssl" },
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "cloudflare" },
  },
  {
    name: "IdenTrust",
    domain: "identrust.com",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "identrust" },
        { kind: "issuerIncludes", substr: "trustid" },
      ],
    },
  },
  {
    name: "Certum (Asseco)",
    domain: "www.certum.eu",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "certum" },
  },
  {
    name: "Fastly",
    domain: "fastly.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "certainly" },
  },
  {
    name: "InCommon",
    domain: "incommon.org",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "incommon" },
  },
];
