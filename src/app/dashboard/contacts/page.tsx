import { createContact } from './actions';
import { prisma } from '@/lib/prisma';
import { requireCurrentOrganization } from '@/lib/tenant';

const categoryLabels: Record<string, string> = {
  LEAD: 'Prospecto',
  CLIENT: 'Cliente',
  RECURRING_CLIENT: 'Cliente recurrente',
  COLLABORATOR: 'Colaborador',
  AGENCY: 'Agencia',
  BUSINESS: 'Contacto comercial',
  BLOCKED: 'Bloqueado',
};

export default async function Contacts() {
  const { organizationId } = await requireCurrentOrganization();
  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: { id: true, displayName: true, category: true, notes: true, updatedAt: true },
  });

  return (
    <>
      <header className="topline"><div><div className="eyebrow">Creator CRM</div><h1>Contactos</h1><p>Tu directorio comercial, organizado y privado.</p></div></header>
      <section className="card" aria-labelledby="new-contact-title">
        <h2 id="new-contact-title">Agregar contacto</h2>
        <form action={createContact} className="contact-form">
          <label>Nombre o identificador comercial<input name="displayName" required minLength={2} maxLength={120} /></label>
          <label>Categoría<select name="category" defaultValue="LEAD">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Nota comercial (opcional)<textarea name="notes" maxLength={2000} rows={3} /></label>
          <button className="button" type="submit">Guardar contacto</button>
        </form>
      </section>
      <section className="card table-wrap section" aria-label="Directorio de contactos">
        <table><thead><tr><th>Nombre</th><th>Categoría</th><th>Última actualización</th></tr></thead>
          <tbody>
            {contacts.map((contact) => <tr key={contact.id}><td><strong>{contact.displayName}</strong>{contact.notes && <small className="contact-note">{contact.notes}</small>}</td><td>{categoryLabels[contact.category] ?? contact.category}</td><td>{contact.updatedAt.toLocaleDateString('es-AR')}</td></tr>)}
            {contacts.length === 0 && <tr><td colSpan={3}>Todavía no hay contactos en este workspace.</td></tr>}
          </tbody>
        </table>
      </section>
      <footer>Los registros se consultan exclusivamente dentro del workspace autenticado. Máximo 100 registros visibles en esta primera versión.</footer>
    </>
  );
}