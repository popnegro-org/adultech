import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { consumeRateLimit } from '../src/lib/rate-limit.mjs';
import { canWriteContacts } from '../src/lib/contact-permissions.mjs';
import { registrationAcceptedResponse } from '../src/lib/registration-response.mjs';
import { isRegistrationEnabled } from '../src/lib/registration-policy.mjs';
import { DUMMY_PASSWORD_HASH } from '../src/lib/auth-utils.mjs';
import { compare } from 'bcryptjs';
import { getClientIp, hasTrustedClientIp } from '../src/lib/client-ip.mjs';

const prisma = new PrismaClient();
assert.equal(canWriteContacts('OWNER'), true);
assert.equal(canWriteContacts('ADMIN'), true);
assert.equal(canWriteContacts('MANAGER'), true);
assert.equal(canWriteContacts('MEMBER'), false);
const registrationCreated = registrationAcceptedResponse();
const registrationDuplicate = registrationAcceptedResponse();
assert.deepEqual(registrationCreated, registrationDuplicate);
assert.equal(registrationCreated.status, 202);
assert.equal(isRegistrationEnabled('development'), true);
assert.equal(isRegistrationEnabled('production'), false);
assert.equal(isRegistrationEnabled(undefined), false);
assert.equal(await compare('unknown-account-password', DUMMY_PASSWORD_HASH), false);
assert.equal(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.10' }), { vercel: true, nodeEnv: 'production' }), 'unknown');
assert.equal(getClientIp(new Headers({ 'x-vercel-forwarded-for': '203.0.113.10' }), { vercel: true, nodeEnv: 'production' }), '203.0.113.10');
assert.equal(getClientIp(new Headers({ 'x-vercel-forwarded-for': 'spoofed, 203.0.113.10' }), { vercel: true, nodeEnv: 'production' }), 'unknown');
assert.equal(getClientIp(new Headers({ 'x-forwarded-for': 'spoofed' }), { vercel: false, nodeEnv: 'production' }), 'unknown');
assert.equal(getClientIp(new Headers(), { vercel: false, nodeEnv: 'development' }), 'local-development');
assert.equal(hasTrustedClientIp('unknown'), false);
assert.equal(hasTrustedClientIp('203.0.113.10'), true);
assert.equal(hasTrustedClientIp('local-development'), true);
const suffix = randomUUID();
let orgA;
let orgB;
let user;
const rateLimitKey = `qa-rate-${suffix}`;
const staleRateLimitKey = `qa-expired-${suffix}`;

try {
  const rateLimitNow = new Date();
  await prisma.rateLimitBucket.create({
    data: {
      key: staleRateLimitKey,
      count: 1,
      windowStart: new Date(rateLimitNow.getTime() - 48 * 60 * 60 * 1000),
      updatedAt: new Date(rateLimitNow.getTime() - 48 * 60 * 60 * 1000),
    },
  });
  assert.equal(await consumeRateLimit(prisma, rateLimitKey, 2, 60_000, rateLimitNow), true);
  assert.equal(await prisma.rateLimitBucket.findUnique({ where: { key: staleRateLimitKey } }), null);
  assert.equal(await consumeRateLimit(prisma, rateLimitKey, 2, 60_000, rateLimitNow), true);
  assert.equal(await consumeRateLimit(prisma, rateLimitKey, 2, 60_000, rateLimitNow), false);
  assert.equal(await consumeRateLimit(prisma, rateLimitKey, 2, 60_000, new Date(rateLimitNow.getTime() + 60_001)), true);

  orgA = await prisma.organization.create({ data: { name: 'QA workspace A', slug: `qa-a-${suffix}` } });
  orgB = await prisma.organization.create({ data: { name: 'QA workspace B', slug: `qa-b-${suffix}` } });
  user = await prisma.user.create({
    data: { email: `qa-${suffix}@example.test`, name: 'QA User', passwordHash: 'not-a-real-password-hash' },
  });
  await prisma.membership.create({ data: { userId: user.id, organizationId: orgA.id, role: 'OWNER' } });

  const [contactA, contactB] = await Promise.all([
    prisma.contact.create({ data: { organizationId: orgA.id, displayName: 'Tenant A contact' } }),
    prisma.contact.create({ data: { organizationId: orgB.id, displayName: 'Tenant B contact' } }),
  ]);

  const tenantAContacts = await prisma.contact.findMany({ where: { organizationId: orgA.id } });
  assert.equal(tenantAContacts.length, 1);
  assert.equal(tenantAContacts[0].id, contactA.id);
  assert.equal((await prisma.contact.findMany({ where: { organizationId: orgA.id, id: contactB.id } })).length, 0);

  const [tagA, tagB] = await Promise.all([
    prisma.contactTag.create({ data: { organizationId: orgA.id, name: 'qa-tag-a' } }),
    prisma.contactTag.create({ data: { organizationId: orgB.id, name: 'qa-tag-b' } }),
  ]);
  await prisma.contactTagAssignment.create({ data: { contactId: contactA.id, tagId: tagA.id, organizationId: orgA.id } });
  await assert.rejects(() => prisma.contactTagAssignment.create({
    data: { contactId: contactA.id, tagId: tagB.id, organizationId: orgA.id },
  }));
  await prisma.contactInteraction.create({ data: { contactId: contactA.id, kind: 'NOTE', summary: 'QA interaction' } });
  await prisma.consentRecord.create({ data: { organizationId: orgA.id, contactId: contactA.id, purpose: 'MARKETING', status: 'GRANTED' } });
  await assert.rejects(() => prisma.consentRecord.create({
    data: { organizationId: orgA.id, contactId: contactB.id, purpose: 'MARKETING', status: 'GRANTED' },
  }));

  assert.equal(await prisma.contactTagAssignment.count({ where: { contactId: contactA.id } }), 1);
  assert.equal(await prisma.consentRecord.count({ where: { organizationId: orgA.id } }), 1);

  await prisma.organization.delete({ where: { id: orgA.id } });
  assert.equal(await prisma.contact.count({ where: { id: contactA.id } }), 0);
  assert.equal(await prisma.consentRecord.count({ where: { contactId: contactA.id } }), 0);

  console.log('Database smoke tests passed: tenant scoping, related records and cascade cleanup.');
} finally {
  if (orgA?.id) await prisma.organization.deleteMany({ where: { id: orgA.id } });
  if (orgB?.id) await prisma.organization.deleteMany({ where: { id: orgB.id } });
  if (user?.id) await prisma.user.deleteMany({ where: { id: user.id } });
  await prisma.rateLimitBucket.deleteMany({ where: { key: { in: [rateLimitKey, staleRateLimitKey] } } });
  await prisma.rateLimitCleanupState.deleteMany({ where: { id: 'global' } });
  await prisma.$disconnect();
}
