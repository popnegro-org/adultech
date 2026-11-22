import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const suffix = randomUUID();
let orgA;
let orgB;
let user;

try {
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

  const tag = await prisma.contactTag.create({ data: { organizationId: orgA.id, name: 'qa-tag' } });
  await prisma.contactTagAssignment.create({ data: { contactId: contactA.id, tagId: tag.id } });
  await prisma.contactInteraction.create({ data: { contactId: contactA.id, kind: 'NOTE', summary: 'QA interaction' } });
  await prisma.consentRecord.create({ data: { organizationId: orgA.id, contactId: contactA.id, purpose: 'MARKETING', status: 'GRANTED' } });

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
  await prisma.$disconnect();
}
