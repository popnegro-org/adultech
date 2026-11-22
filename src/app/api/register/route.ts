import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { consumeRateLimit } from '@/lib/rate-limit.mjs';

export const runtime = 'nodejs';

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(72),
  isAdult: z.literal(true),
});

export async function POST(request: Request) {
  const ip = (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown').slice(0, 64);
  try {
    const allowed = await consumeRateLimit(prisma, `register:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Volvé a probar en 15 minutos.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Servicio temporalmente no disponible.' }, { status: 503 });
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisá los datos. La contraseña debe tener al menos 12 caracteres y debés confirmar que sos mayor de 18 años.' }, { status: 400 });
  }

  if (new TextEncoder().encode(parsed.data.password).length > 72) {
    return NextResponse.json({ error: 'La contraseña supera el máximo admitido.' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await hash(parsed.data.password, 12);
  const slug = `workspace-${randomUUID().slice(0, 8)}`;

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: parsed.data.name, passwordHash },
        select: { id: true },
      });
      const organization = await tx.organization.create({
        data: { name: `Workspace de ${parsed.data.name}`, slug },
        select: { id: true },
      });
      await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: 'OWNER' },
      });
    });
  } catch {
    // Avoid disclosing whether an email address is already registered.
    return NextResponse.json({ error: 'No se pudo crear la cuenta. Verificá los datos o iniciá sesión.' }, { status: 409 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}