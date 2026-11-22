import 'server-only';
import { prisma } from '@/lib/prisma';

/** Resolve a workspace only through a verified user membership. */
export async function requireOrganization(userId: string, organizationId: string) {
  if (!userId || !organizationId) throw new Error('UNAUTHORIZED');
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { organizationId: true, role: true },
  });
  if (!membership) throw new Error('FORBIDDEN');
  return membership;
}
