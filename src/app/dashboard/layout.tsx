import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

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
          <b className="brand-mark">I</b>
          <div>IvanaCain<small>Adult Creator CRM</small></div>
        </Link>
        <nav className="nav" aria-label="Navegación principal">
          {items.map(([label, href]) => (
            <Link key={label} href={href}>{label}</Link>
          ))}
        </nav>
        <div className="workspace">
          {session.user.name || session.user.email || 'Workspace'}
          <span>Espacio privado</span>
          <Link href="/api/auth/signout">Cerrar sesión</Link>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}