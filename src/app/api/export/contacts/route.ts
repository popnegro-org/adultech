import { NextResponse } from 'next/server';
import { requireCurrentOrganization } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

function csvCell(value: string | null | undefined) {
  return `"${(value ?? '').replaceAll('"', '""')}"`;
}

export const runtime = 'nodejs';

export async function GET() {
  const { organizationId, userId } = await requireCurrentOrganization();
  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    include: { tags: { include: { tag: true } } },
  });
  const rows = [
    ['Nombre', 'Categoría', 'Notas', 'Etiquetas', 'Creado'],
    ...contacts.map((contact) => [contact.displayName, contact.category, contact.notes ?? '', contact.tags.map(({ tag }) => tag.name).join('; '), contact.createdAt.toISOString()]),
  ];
  const csv = '\uFEFF' + rows.map((row) => row.map((cell) => csvCell(cell)).join(',')).join('\r\n');
  await prisma.auditLog.create({ data: { organizationId, actorUserId: userId, action: 'privacy.contacts.exported', resourceType: 'Organization', resourceId: organizationId } });
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ivanacain-contactos.csv"', 'Cache-Control': 'private, no-store' } });
}