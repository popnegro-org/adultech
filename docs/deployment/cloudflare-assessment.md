# Cloudflare deployment assessment

Date: 2026-11-26
Repository: `popnegro-org/adultech`
Candidate branch: `feat/ivana-cain-pmv-foundation`

## Decision

Cloudflare Workers is a viable target for the existing Next.js application. An OpenNext/Workers candidate configuration and CI build job are now committed, but the migration is **not ready for runtime or production**. Keep the current Vercel Preview unchanged until the Cloudflare candidate passes authenticated, database-backed functional tests.

Do not create a second application or replace the existing candidate branch.

## Repository baseline

- Product package metadata is now named `adultech`; the visible landing, login, dashboard and metadata use the Adultech brand.
- Next.js 15.5.29, React 19.1.1, Auth.js 5.0.0-beta.32.
- Prisma 6.19.3, PostgreSQL datasource, no driver adapter configured.
- `wrangler.jsonc` and `open-next.config.mjs` are committed. The Worker name is `adultech-preview`, with `nodejs_compat`, assets binding, `CLOUDFLARE_WORKERS=1`, logs and traces enabled.
- `package.json` includes pinned `cf:install`, `cf:build`, `cf:preview` and `cf:typegen` scripts. OpenNext 1.20.18 and Wrangler 4.165.0 are installed temporarily with `--no-save --package-lock=false`; they are not yet committed as lockfile dependencies.
- Auth.js Credentials uses `node:crypto`, bcryptjs, JWT sessions and a PostgreSQL-backed rate limiter.
- The trusted client-IP helper supports Vercel's `x-vercel-forwarded-for` and Cloudflare's `cf-connecting-ip` when `CLOUDFLARE_WORKERS=1`; it fails closed on other production ingress.
- The application currently describes itself as a Creator CRM. It does not host or distribute explicit content and does not process payments for adult content.

## Verification performed

On the candidate branch, in an isolated ephemeral workspace:

| Check | Result |
|---|---|
| `npm ci` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run db:validate` | Passed |
| `npm audit --audit-level=high` | Passed; 0 vulnerabilities |
| `npm run build` | Passed |
| GitHub Actions CI #87 for commit `7471682ff9d12b4270599f8835041ec4e24ef64f` | Passed |
| GitHub Actions CI #90 for commit `3d8247540206d1d219a7bc64fa72d0e92326178e` | Passed |
| GitHub Actions CI #92 for commit `20f72e5c7d8a96bc3760ad0aedc020f58fcfe7e7` | Passed, including the Cloudflare IP parsing tests |
| Vercel commit status for commit `20f72e5c7d8a96bc3760ad0aedc020f58fcfe7e7` | Success |
| `npx vinext check` | 92% compatible; one blocking library issue |
| `npx opennextjs-cloudflare build` (previous isolated run) | Passed |
| OpenNext local preview (previous isolated run) | Landing and login returned HTTP 200; dashboard redirected to login. Auth provider endpoint returned HTTP 500 in the first preview because runtime secrets were absent. A second preview could not be completed after the ephemeral runner reached its monthly compute quota. |
| New CI job `cloudflare-build` | Added to `.github/workflows/ci.yml`; latest run is queued/pending and has not yet produced job results. It runs the OpenNext build and `wrangler deploy --dry-run`, without Cloudflare credentials or deployment. |

The local checks used placeholder database configuration. No live database connection, migration, authenticated session, or write operation was tested.

## Framework findings

### vinext

Cloudflare currently recommends vinext for Next.js on Workers. The compatibility scan found:

- App Router, route handlers, `next/server`, `next/cache`, `next/navigation`, `server-only`, Zod and Prisma are reported compatible.
- `next-auth` is reported incompatible because it relies on Next.js API route internals.

Do not switch to vinext while Auth.js remains in place without either resolving this compatibility gap or completing and testing an authentication migration.

### OpenNext

OpenNext successfully generated a Workers bundle from the current Next.js 15.5.29 application. Cloudflare documents OpenNext as a maintenance path when vinext compatibility is insufficient, not the preferred path for new applications.

The successful bundle is not proof of runtime compatibility. Auth.js, database access, Cloudflare bindings and authenticated routes still require runtime validation.

## Database requirements

The existing database is **Prisma Postgres**, database `ivanacain`, currently reported READY in the Prisma workspace. It is not a Neon database. No migrations have been applied to that live database, and the previous approval for read-only SQL inspection expired without a query being run.

The Cloudflare account currently has no Hyperdrive configuration for Adultech. The application currently instantiates Prisma without a driver adapter.

Before using Prisma Postgres through Hyperdrive:

1. Obtain an approved, dedicated non-production database branch/connection for Cloudflare validation; do not use production data.
2. Create a dedicated Hyperdrive configuration from that approved connection string.
3. Configure Prisma with the PostgreSQL driver adapter supported by the pinned Prisma version.
4. Resolve request-scoped connection/client lifecycle according to Hyperdrive's Workers guidance.
5. Verify migrations, transactions, rate limiting and tenant-isolation tests against the isolated database.

Do not reuse another project's database or credentials.

## Trusted client IP

Cloudflare support is implemented in `src/lib/client-ip.mjs`:

- Vercel continues to trust only the validated `x-vercel-forwarded-for` header.
- Cloudflare mode is explicitly enabled with the Worker environment variable `CLOUDFLARE_WORKERS=1` and trusts only a single valid `cf-connecting-ip` address.
- Arbitrary `X-Forwarded-For` values and malformed/multi-value IP headers are rejected.
- The database smoke test covers IPv4, IPv6, invalid values and spoofed `X-Forwarded-For` input. CI #92 passed these assertions.

The flag is not yet configured in a Wrangler/Workers deployment because no Adultech Worker has been created. Cloudflare documents `CF-Connecting-IP` as the client address added by its edge; this assumes the application Worker receives the original request directly and no upstream Worker mutates the header.

## Cloudflare resources

Read-only account inspection found no Adultech-specific Worker, Hyperdrive configuration, R2 bucket or Adultech domain/zone. Existing resources belonging to other projects were not modified.

## Recommended target

- Cloudflare Workers for the app and API.
- Prisma Postgres retained as the relational database.
- Hyperdrive for Worker-to-PostgreSQL connectivity.
- Private R2 bucket for future media storage only if the product scope changes to hosting media; no public bucket.
- GitHub Actions for CI and isolated Workers Preview environments.
- Workers Paid is the likely production starting point (published minimum $5/month). Workers Free is limited to 100,000 requests/day and 10 ms CPU/request; that CPU ceiling may be too restrictive for bcrypt-based authentication and server-side rendering. Paid offers a substantially higher CPU allowance.

## Product and policy boundary

This repository is currently a CRM and explicitly does not host explicit content or process content payments. If the scope changes to adult media hosting or marketplace transactions, obtain written Cloudflare confirmation for the exact products and use case, and complete legal, age/identity, consent, moderation, takedown and payment-provider reviews before accepting real content or money.

## Remaining acceptance criteria

- [ ] Choose and prove an authentication-compatible deployment path (vinext after auth compatibility is solved, or OpenNext as a temporary path).
- [x] Add the OpenNext/Workers configuration and CI build job to the candidate branch.
- [x] Set `CLOUDFLARE_WORKERS=1` in the candidate Worker configuration (not deployed yet).
- [ ] Move OpenNext and Wrangler from temporary no-save installation into pinned devDependencies and regenerate `package-lock.json`.
- [ ] Configure a dedicated Hyperdrive binding and Prisma driver adapter using an approved non-production database connection.
- [ ] Run the full CI suite including the new `cloudflare-build` job; inspect the first execution and fix any build/runtime bundling failures.
- [ ] Run Cloudflare local runtime preview with non-production secrets and a dedicated database.
- [ ] Verify login, logout, session expiry, registration policy, rate limiting and trusted-IP spoof resistance on Workers.
- [ ] Run PostgreSQL migration, smoke tests and multi-tenant isolation tests against the dedicated non-production database.
- [ ] Complete visual and functional QA.
- [ ] Obtain written Cloudflare product-policy confirmation if the scope includes explicit media hosting.
- [ ] Human approval before production deployment, DNS cutover, paid-plan activation, or merge to `main`.

## References

- Cloudflare Next.js / vinext: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Cloudflare OpenNext: https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- Cloudflare HTTP headers: https://developers.cloudflare.com/fundamentals/reference/http-headers/
- Prisma + Hyperdrive: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/prisma-orm/
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
