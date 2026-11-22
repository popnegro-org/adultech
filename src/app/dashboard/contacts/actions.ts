'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentOrganization } from '@/lib/tenant';

const contactSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  category: z.enum(['LEAD', 'CLIENT', 'RECURRING_CLIENT', 'COLLABORATOR', 'AGENCY', 'BUSINESS', 'BLOCKED']),
  notes: z.string().trim().max(2000).optional(),
});

export async function createContact(formData: FormData) {
  const parsed = contactSchema.safeParse({
    displayName: formData.get('displayName'),
    category: formData.get('category'),
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) throw new Error('Datos de contacto inválidos.');

  const { organizationId, userId } = await requireCurrentOrganization();
  await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.create({
      data: {
        organizationId,
        displayName: parsed.data.displayName,
        category: parsed.data.category,
        notes: parsed.data.notes,
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: 'contact.created',
        resourceType: 'Contact',
        resourceId: contact.id,
      },
    });
  });

  revalidatePath('/dashboard/contacts');
}