import { NextResponse } from 'next/server';
import { requireCurrentOrganization } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

function csvCell(value: string | null | undefined) {
  const raw = value ?? '';
  const safe = /^[=+@-]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export const runtime = 'nodejs';

export async function GET() {
  let workspace: Awaited<ReturnType<typeof requireCurrentOrganization>>;
  try {
    workspace = await requireCurrentOrganization();
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Autenticación requerida.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Workspace no autorizado.' }, { status: 403 });
    }
    throw error;
  }

  const { organizationId, userId } = workspace;
  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    include: { tags: { include: { tag: true } } },
  });
  const rows = [
    ['Nombre', 'Categoría', 'Notas', 'Etiquetas', 'Creado'],
    ...contacts.map((contact) => [
      contact.displayName,
      contact.category,
      contact.notes ?? '',
      contact.tags.map(({ tag }) => tag.name).join('; '),
      contact.createdAt.toISOString(),
    ]),
  ];
  const csv = '\uFEFF' + rows.map((row) => row.map((cell) => csvCell(cell)).join(',')).join('\r\n');

  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: userId,
      action: 'privacy.contacts.exported',
      resourceType: 'Organization',
      resourceId: organizationId,
    },
  });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ivanacain-contactos.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}