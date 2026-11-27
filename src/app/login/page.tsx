import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AuthForm from './auth-form';
import { isRegistrationEnabled } from '@/lib/registration-policy.mjs';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/dashboard');

  return (
    <main className="auth-page">
      <Link href="/" className="brand">
        <b className="brand-mark">A</b>
        <div>Adultech<small>Adult Creator CRM</small></div>
      </Link>
      <section className="auth-card">
        <div className="eyebrow">Tu negocio. Tu audiencia. Tu control.</div>
        <h1>Accedé a tu workspace</h1>
        <p>Gestioná tu actividad comercial en un espacio privado.</p>
        <AuthForm registrationEnabled={isRegistrationEnabled()} />
        <small>Servicio para mayores de 18 años. No alojamos ni distribuimos contenido explícito.</small>
      </section>
    </main>
  );
}
