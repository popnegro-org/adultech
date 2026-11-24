import { createHmac } from 'node:crypto';
import { getClientIp } from '@/lib/client-ip.mjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { consumeRateLimit } from '@/lib/rate-limit.mjs';
import { DUMMY_PASSWORD_HASH } from '@/lib/auth-utils.mjs';

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(72),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Correo electrónico', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        const ip = getClientIp(request.headers).slice(0, 64);
        const rateLimitSecret = process.env.AUTH_SECRET;
        if (!rateLimitSecret) throw new Error('AUTH_SECRET is required for authentication rate limiting.');
        const ipKey = createHmac('sha256', rateLimitSecret).update(ip).digest('hex');
        const emailKey = createHmac('sha256', rateLimitSecret).update(email).digest('hex');
        const [ipAllowed, emailAllowed] = await Promise.all([
          consumeRateLimit(prisma, `login:ip:${ipKey}`, 12, 15 * 60 * 1000),
          consumeRateLimit(prisma, `login:email:${emailKey}`, 8, 15 * 60 * 1000),
        ]);
        if (!ipAllowed || !emailAllowed) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // Always perform one cost-12 bcrypt comparison to reduce account-enumeration timing differences.
        const valid = await compare(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!user || !valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});