import { isIP } from 'node:net';

/**
 * Read a client IP only from the active, explicitly trusted ingress.
 * Never trust a caller-provided X-Forwarded-For value.
 * @param {{ get(name: string): string | null }} headers
 * @param {{ vercel?: boolean, cloudflare?: boolean, nodeEnv?: string }} options
 */
export function getClientIp(headers, options = {}) {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const cloudflare = options.cloudflare ?? process.env.CLOUDFLARE_WORKERS === '1';
  const vercel = options.vercel ?? process.env.VERCEL === '1';

  // Workers must be reached through Cloudflare's edge; CF-Connecting-IP is the single-value edge header.
  if (cloudflare) {
    const value = headers.get('cf-connecting-ip')?.trim();
    return value && isIP(value) ? value : 'unknown';
  }

  if (vercel) {
    const value = headers.get('x-vercel-forwarded-for')?.trim();
    return value && isIP(value) ? value : 'unknown';
  }

  return nodeEnv === 'development' ? 'local-development' : 'unknown';
}

/**
 * An unknown client address must never share a global IP rate-limit bucket.
 * Development's local-development sentinel is intentionally accepted.
 * @param {string} ip
 */
export function hasTrustedClientIp(ip) {
  return ip !== 'unknown';
}
