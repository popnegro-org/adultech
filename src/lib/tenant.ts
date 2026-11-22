import 'server-only';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Resolve a workspace only from the authenticated Auth.js session.
 * The organization id is never accepted from a client-controlled argument.
 */
export async function requireCurrentOrganization() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) throw new Error('UNAUTHORIZED');

  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      organizationId: true,
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!membership) throw new Error('FORBIDDEN');

  return {
    organizationId: membership.organizationId,
    role: membership.role,
    organization: membership.organization,
    userId,
  };
}