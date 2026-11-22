import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireCurrentOrganization } from '@/lib/tenant';

export default async function Dashboard() {
  const { organizationId, organization } = await requireCurrentOrganization();
  const [contacts, campaigns] = await Promise.all([
    prisma.contact.count({ where: { organizationId } }),
    prisma.campaign.count({ where: { organizationId } }),
  ]);
  const metrics = [
    ['Contactos', String(contacts), 'En tu directorio'],
    ['Campañas', String(campaigns), 'Registradas en tu workspace'],
    ['Clics registrados', '—', 'Marketing Hub pendiente'],
    ['Ingresos declarados', '—', 'Revenue Tracker pendiente'],
  ];

  return (
    <>
      <header className="topline"><div><div className="eyebrow">Workspace / Overview</div><h1>{organization.name}</h1><p>Una vista clara de tu actividad comercial.</p></div><div className="avatar" aria-hidden="true">IC</div></header>
      <section className="grid">{metrics.map(([label, value, note]) => <article className="card" key={label}><div className="muted">{label}</div><div className="metric">{value}</div><small>{note}</small></article>)}</section>
      <section className="section"><div className="section-head"><h2>Próximos pasos</h2><Link className="button secondary" href="/dashboard/contacts">Administrar contactos</Link></div>
        <div className="card activity"><p>Tu CRM consulta datos persistidos y limitados a tu organización.</p><p>El módulo de campañas todavía no habilita envíos ni automatizaciones.</p><p>Las métricas e ingresos se mostrarán cuando sus módulos estén implementados.</p></div>
      </section>
    </>
  );
}