import { isIP } from 'node:net';

/**
 * Use only the client address injected by Vercel's trusted edge.
 * Never trust a caller-provided X-Forwarded-For value on generic ingress.
 * @param {{ get(name: string): string | null }} headers
 * @param {{ vercel?: boolean, nodeEnv?: string }} options
 */
export function getClientIp(headers, options = {}) {
  const vercel = options.vercel ?? process.env.VERCEL === '1';
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;

  if (!vercel) return nodeEnv === 'development' ? 'local-development' : 'unknown';

  const value = headers.get('x-vercel-forwarded-for')?.trim();
  return value && isIP(value) ? value : 'unknown';
}

/**
 * An unknown client address must never share a global IP rate-limit bucket.
 * Development's local-development sentinel is intentionally accepted.
 * @param {string} ip
 */
export function hasTrustedClientIp(ip) {
  return ip !== 'unknown';
}
