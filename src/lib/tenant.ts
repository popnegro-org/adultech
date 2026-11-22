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

  const memberships = await prisma.membership.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      organizationId: true,
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  // Never silently select the first workspace when a user has multiple memberships.
  if (memberships.length !== 1) throw new Error('FORBIDDEN');
  const membership = memberships[0];

  return {
    organizationId: membership.organizationId,
    role: membership.role,
    organization: membership.organization,
    userId,
  };
}