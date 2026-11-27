import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';

const items = [
  ['Overview', '/dashboard'],
  ['Contactos', '/dashboard/contacts'],
  ['Campañas', '/dashboard/campaigns'],
  ['Analítica', '/dashboard/analytics'],
  ['Ingresos', '/dashboard/revenue'],
  ['Configuración', '/dashboard/settings'],
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <b className="brand-mark">A</b>
          <div>Adultech<small>Adult Creator CRM</small></div>
        </Link>
        <nav className="nav" aria-label="Navegación principal">
          {items.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
        </nav>
        <div className="workspace">
          {session.user.name || session.user.email || 'Workspace'}
          <span>Espacio privado</span>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }); }}>
            <button className="auth-switch" type="submit">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
