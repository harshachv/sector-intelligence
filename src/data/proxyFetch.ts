/**
 * Browser-friendly CORS proxy fetcher with a fallback chain + per-proxy retry.
 *
 * Public CORS proxies (corsproxy.io, allorigins.win, codetabs.com) all rate-limit
 * bursts aggressively. This module:
 *  - tries multiple proxies and remembers which one worked last
 *  - retries with backoff when an attempt fails
 *  - throttles globally so we don't hammer any single proxy
 *
 * Users with their own worker can set VITE_YAHOO_PROXY (used for Yahoo URLs)
 * to take a fast direct path.
 */

interface ProxyConfig {
  name: string;
  url: (target: string) => string;
  unwrap: (raw: string) => string | null;
}

const PROXIES: ProxyConfig[] = [
  {
    name: 'allorigins/raw',
    url: t => `https://api.allorigins.win/raw?url=${encodeURIComponent(t)}`,
    unwrap: t => t,
  },
  {
    name: 'codetabs',
    url: t => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(t)}`,
    unwrap: t => t,
  },
  {
    name: 'allorigins/get',
    url: t => `https://api.allorigins.win/get?url=${encodeURIComponent(t)}`,
    unwrap: t => {
      try { return JSON.parse(t).contents ?? null; }
      catch { return null; }
    },
  },
];

// Global throttle — paced for public proxy free tiers.
const MIN_INTERVAL_MS = 200;     // ≈5 req/s ceiling across the whole app
let lastFetchAt = 0;

async function gate(): Promise<void> {
  const now = Date.now();
  const wait = lastFetchAt + MIN_INTERVAL_MS - now;
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastFetchAt = Date.now();
}

// Remember which proxy worked last so the next request tries it first.
let preferredIdx = 0;

function tryOrder(): ProxyConfig[] {
  const head = PROXIES[preferredIdx % PROXIES.length];
  return [head, ...PROXIES.filter(p => p !== head)];
}

async function tryProxy<T>(proxy: ProxyConfig, target: string): Promise<T | null> {
  try {
    const res = await fetch(proxy.url(target));
    if (!res.ok) return null;
    const raw = await res.text();
    const inner = proxy.unwrap(raw);
    if (!inner) return null;
    return JSON.parse(inner) as T;
  } catch {
    return null;
  }
}

/**
 * Fetch a remote URL through a CORS proxy. Tries each proxy in turn, with one
 * extra full pass after a brief backoff. Returns parsed JSON or null.
 */
export async function proxyJSON<T = unknown>(targetUrl: string): Promise<T | null> {
  await gate();
  for (let attempt = 0; attempt < 2; attempt++) {
    const proxies = tryOrder();
    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];
      const result = await tryProxy<T>(proxy, targetUrl);
      if (result != null) {
        // sanity-check: the parsed payload must have at least one key,
        // otherwise it's likely an error envelope from the proxy.
        if (typeof result === 'object' && result !== null && Object.keys(result).length > 0) {
          preferredIdx = PROXIES.indexOf(proxy);
          return result;
        }
      }
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 800));
  }
  return null;
}
