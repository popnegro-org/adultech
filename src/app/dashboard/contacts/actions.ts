'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentOrganization } from '@/lib/tenant';

const category = z.enum(['LEAD', 'CLIENT', 'RECURRING_CLIENT', 'COLLABORATOR', 'AGENCY', 'BUSINESS', 'BLOCKED']);
const contactInput = z.object({
  displayName: z.string().trim().min(2).max(120),
  category,
  notes: z.string().trim().max(2000).optional(),
});

async function assertContactInWorkspace(contactId: string, organizationId: string) {
  const contact = await prisma.contact.findFirst({ where: { id: contactId, organizationId }, select: { id: true } });
  if (!contact) throw new Error('CONTACT_NOT_FOUND');
}

export async function createContact(formData: FormData) {
  const parsed = contactInput.safeParse({ displayName: formData.get('displayName'), category: formData.get('category'), notes: formData.get('notes') || undefined });
  if (!parsed.success) throw new Error('Datos de contacto inválidos.');
  const { organizationId, userId } = await requireCurrentOrganization();
  await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.create({ data: { organizationId, ...parsed.data }, select: { id: true } });
    await tx.auditLog.create({ data: { organizationId, actorUserId: userId, action: 'contact.created', resourceType: 'Contact', resourceId: contact.id } });
  });
  revalidatePath('/dashboard/contacts');
}

export async function updateContact(formData: FormData) {
  const id = z.string().cuid().parse(formData.get('id'));
  const parsed = contactInput.safeParse({ displayName: formData.get('displayName'), category: formData.get('category'), notes: formData.get('notes') || undefined });
  if (!parsed.success) throw new Error('Datos de contacto inválidos.');
  const { organizationId, userId } = await requireCurrentOrganization();
  await assertContactInWorkspace(id, organizationId);
  await prisma.$transaction([
    prisma.contact.update({ where: { id }, data: parsed.data }),
    prisma.auditLog.create({ data: { organizationId, actorUserId: userId, action: 'contact.updated', resourceType: 'Contact', resourceId: id } }),
  ]);
  revalidatePath('/dashboard/contacts');
}

export async function deleteContact(formData: FormData) {
  const id = z.string().cuid().parse(formData.get('id'));
  const { organizationId, userId } = await requireCurrentOrganization();
  await assertContactInWorkspace(id, organizationId);
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({ data: { organizationId, actorUserId: userId, action: 'contact.deleted', resourceType: 'Contact', resourceId: id } });
    await tx.contact.delete({ where: { id } });
  });
  revalidatePath('/dashboard/contacts');
}

export async function addInteraction(formData: FormData) {
  const contactId = z.string().cuid().parse(formData.get('contactId'));
  const parsed = z.object({ kind: z.enum(['NOTE', 'MESSAGE', 'FOLLOW_UP', 'OTHER']), summary: z.string().trim().min(2).max(500) }).safeParse({ kind: formData.get('kind'), summary: formData.get('summary') });
  if (!parsed.success) throw new Error('Interacción inválida.');
  const { organizationId, userId } = await requireCurrentOrganization();
  await assertContactInWorkspace(contactId, organizationId);
  await prisma.$transaction(async (tx) => {
    await tx.contactInteraction.create({ data: { contactId, ...parsed.data } });
    await tx.auditLog.create({ data: { organizationId, actorUserId: userId, action: 'contact.interaction.created', resourceType: 'Contact', resourceId: contactId } });
  });
  revalidatePath('/dashboard/contacts');
}

export async function addContactTag(formData: FormData) {
  const contactId = z.string().cuid().parse(formData.get('contactId'));
  const name = z.string().trim().min(2).max(40).parse(formData.get('name'));
  const { organizationId, userId } = await requireCurrentOrganization();
  await assertContactInWorkspace(contactId, organizationId);
  await prisma.$transaction(async (tx) => {
    const tag = await tx.contactTag.upsert({ where: { organizationId_name: { organizationId, name } }, create: { organizationId, name }, update: {}, select: { id: true } });
    await tx.contactTagAssignment.upsert({ where: { contactId_tagId: { contactId, tagId: tag.id } }, create: { contactId, tagId: tag.id }, update: {} });
    await tx.auditLog.create({ data: { organizationId, actorUserId: userId, action: 'contact.tag.added', resourceType: 'Contact', resourceId: contactId } });
  });
  revalidatePath('/dashboard/contacts');
}

export async function recordConsent(formData: FormData) {
  const contactId = z.string().cuid().parse(formData.get('contactId'));
  const parsed = z.object({ purpose: z.enum(['MARKETING', 'COMMUNICATIONS']), status: z.enum(['PENDING', 'GRANTED', 'WITHDRAWN']), source: z.string().trim().max(120).optional() }).safeParse({
    purpose: formData.get('purpose'), status: formData.get('status'), source: formData.get('source') || undefined,
  });
  if (!parsed.success) throw new Error('Registro de consentimiento inválido.');
  const { organizationId, userId } = await requireCurrentOrganization();
  await assertContactInWorkspace(contactId, organizationId);
  await prisma.$transaction(async (tx) => {
    await tx.consentRecord.create({ data: { organizationId, contactId, ...parsed.data, withdrawnAt: parsed.data.status === 'WITHDRAWN' ? new Date() : null } });
    await tx.auditLog.create({ data: { organizationId, actorUserId: userId, action: 'contact.consent.recorded', resourceType: 'Contact', resourceId: contactId } });
  });
  revalidatePath('/dashboard/contacts');
}
