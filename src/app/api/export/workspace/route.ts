import { NextResponse } from 'next/server';
import { requireCurrentOrganization } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

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

  const { organizationId, userId, role } = workspace;
  if (!['OWNER', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Solo OWNER o ADMIN pueden exportar el workspace completo.' }, { status: 403 });
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: userId,
      action: 'privacy.workspace.exported',
      resourceType: 'Organization',
      resourceId: organizationId,
    },
  });

  const [account, organization, memberships, contacts, campaigns, auditLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, createdAt: true },
    }),
    prisma.membership.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.contact.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      include: {
        interactions: { orderBy: { occurredAt: 'asc' } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
        consentRecords: { orderBy: { capturedAt: 'asc' } },
      },
    }),
    prisma.campaign.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } }),
    prisma.auditLog.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } }),
  ]);

  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    account,
    organization,
    memberships,
    contacts,
    campaigns,
    auditLogs,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ivanacain-workspace-export.json"',
      'Cache-Control': 'private, no-store',
    },
  });
}
