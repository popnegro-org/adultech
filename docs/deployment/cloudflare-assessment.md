# Cloudflare deployment assessment

Date: 2026-11-26
Repository: `popnegro-org/adultech`
Candidate branch: `feat/ivana-cain-pmv-foundation`

## Decision

Cloudflare Workers is a viable target for the existing Next.js application, but the migration is **not ready for production**. Keep the current Vercel deployment unchanged until the Cloudflare candidate passes authenticated, database-backed functional tests.

Do not create a second application or replace the existing candidate branch.

## Repository baseline

- Next.js 15.5.29, React 19.1.1, Auth.js 5.0.0-beta.32.
- Prisma 6.19.3, PostgreSQL datasource, no driver adapter configured.
- Auth.js Credentials uses `node:crypto`, bcryptjs, JWT sessions and a PostgreSQL-backed rate limiter.
- The current trusted client-IP helper only accepts `x-vercel-forwarded-for` when `VERCEL=1`; it fails closed on other production ingress.
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
| GitHub Actions CI for commit `7471682ff9d12b4270599f8835041ec4e24ef64f` | Passed |
| Vercel commit status | Passed |
| `npx vinext check` | 92% compatible; one blocking library issue |
| `npx opennextjs-cloudflare build` | Passed |
| OpenNext local preview | Landing and login returned HTTP 200; dashboard redirected to login. Auth provider endpoint returned HTTP 500 in the first preview because runtime secrets were absent. A second preview could not be completed after the ephemeral runner reached its monthly compute quota. |

The local checks used placeholder database configuration. No live database connection, migration, authenticated session, or write operation was tested.

## Framework findings

### vinext

Cloudflare currently recommends vinext for Next.js on Workers. The compatibility scan found:

- App Router, route handlers, `next/server`, `next/cache`, `next/navigation`, `server-only`, Zod and Prisma are reported compatible.
- `next-auth` is reported incompatible because it relies on Next.js API route internals.

Do not switch to vinext while Auth.js remains in place without either resolving this compatibility gap or completing and testing an authentication migration.

### OpenNext

OpenNext successfully generated a Workers bundle from the current Next.js 15.5.29 application. Cloudflare documents OpenNext as a maintenance path when vinext compatibility is insufficient, not the preferred path for new applications.

The successful bundle is not proof of runtime compatibility. Auth.js, database access, trusted client-IP handling and authenticated routes still require runtime validation.

## Database requirements

The Cloudflare account currently has no Hyperdrive configuration for Adultech. The application currently instantiates Prisma without a driver adapter.

Before using Neon through Hyperdrive:

1. Create a dedicated Hyperdrive configuration for the Adultech Neon database, only after the database and credentials are approved.
2. Configure Prisma with the PostgreSQL driver adapter supported by the pinned Prisma version.
3. Resolve request-scoped connection/client lifecycle according to Hyperdrive's Workers guidance.
4. Verify migrations, transactions, rate limiting and tenant-isolation tests against an isolated non-production database.

Do not reuse another project's database or credentials.

## Trusted client IP

The current `src/lib/client-ip.mjs` only trusts Vercel's `x-vercel-forwarded-for`. Cloudflare deployment requires a separate, verified Cloudflare ingress implementation. Do not blindly trust arbitrary `X-Forwarded-For` headers. Add tests for spoofed headers, direct ingress and Cloudflare-proxied requests before enabling hosted authentication.

## Cloudflare resources

Read-only account inspection found no Adultech-specific Worker, Hyperdrive configuration, R2 bucket or Adultech domain/zone. Existing resources belonging to other projects were not modified.

## Recommended target

- Cloudflare Workers for the app and API.
- Neon PostgreSQL retained as the relational database.
- Hyperdrive for Worker-to-PostgreSQL connectivity.
- Private R2 bucket for future media storage only if the product scope changes to hosting media; no public bucket.
- GitHub Actions for CI and isolated Workers Preview environments.
- Cloudflare Workers Paid is the likely production starting point (published minimum $5/month); Workers Free can be used for non-commercial internal QA subject to its 100,000 requests/day and 10 ms CPU/request limits.

## Product and policy boundary

This repository is currently a CRM and explicitly does not host explicit content or process content payments. If the scope changes to adult media hosting or marketplace transactions, obtain written Cloudflare confirmation for the exact products and use case, and complete legal, age/identity, consent, moderation, takedown and payment-provider reviews before accepting real content or money.

## Remaining acceptance criteria

- [ ] Choose and prove an authentication-compatible deployment path (vinext after auth compatibility is solved, or OpenNext as a temporary path).
- [ ] Configure a dedicated Hyperdrive binding and Prisma driver adapter.
- [ ] Replace Vercel-only client-IP trust with verified Cloudflare ingress handling.
- [ ] Run the full CI suite and Cloudflare runtime preview.
- [ ] Verify login, logout, session expiry, registration policy, rate limiting and trusted-IP spoof resistance.
- [ ] Run PostgreSQL migration, smoke tests and multi-tenant isolation tests against a dedicated non-production database.
- [ ] Complete visual and functional QA.
- [ ] Obtain written Cloudflare product-policy confirmation if the scope includes explicit media hosting.
- [ ] Human approval before production deployment, DNS cutover, paid-plan activation, or merge to `main`.

## References

- Cloudflare Next.js / vinext: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Cloudflare Vercel-to-Workers migration: https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/nextjs/
- Cloudflare OpenNext: https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- Prisma + Hyperdrive: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/prisma-orm/
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
