/**
 * Market-research aggregators, SEO "market size report" mills, and wire services.
 *
 * These dominate generic web search for any commercial topic, but their pages name no
 * real product companies the analyst can extract — the model ends up emitting the
 * research firm (or its domain) as the "company". We attack them on two fronts:
 *   1. `AGGREGATOR_DOMAINS` → Tavily `exclude_domains`, so they never take a result slot
 *      and vendor / news / listicle pages surface instead.
 *   2. `AGGREGATOR_TOKENS` → reject any market item whose `company` resolves to one of
 *      them (belt-and-braces for the deterministic fallback / a model that still leaks one).
 */
export const AGGREGATOR_DOMAINS = [
  "statista.com",
  "marketsandmarkets.com",
  "mordorintelligence.com",
  "fortunebusinessinsights.com",
  "grandviewresearch.com",
  "researchandmarkets.com",
  "rootsanalysis.com",
  "abiresearch.com",
  "snsinsider.com",
  "futuremarketinsights.com",
  "credenceresearch.com",
  "bccresearch.com",
  "precedenceresearch.com",
  "imarcgroup.com",
  "alliedmarketresearch.com",
  "verifiedmarketresearch.com",
  "gminsights.com",
  "marketresearchfuture.com",
  "technavio.com",
  "polarismarketresearch.com",
  "kenresearch.com",
  "counterpointresearch.com",
  "companiesmarketcap.com",
  "globalmarketingproducts.com",
  "prnewswire.com",
  "globenewswire.com",
  "businesswire.com",
  "gfmag.com",
  "greenbook.org",
  "libretexts.org",
  "marketdataforecast.com",
  "coherentmarketinsights.com",
] as const;

// Normalized (lowercase, alphanumerics-only) substrings that mark a `company` value as a
// junk aggregator. Domain roots cover "Mordor Intelligence" → "mordorintelligence", etc.;
// the extra short aliases catch the forms a model emits ("Counterpoint", "IEA").
export const AGGREGATOR_TOKENS = [
  ...AGGREGATOR_DOMAINS.map((domain) => domain.split(".")[0]),
  "counterpoint",
  "mordor",
  "grandview",
  "iea",
] as const;
