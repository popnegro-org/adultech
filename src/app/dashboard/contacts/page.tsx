import { addContactTag, addInteraction, createContact, recordConsent, updateContact } from './actions';
import DeleteContactForm from './delete-contact-form';
import { prisma } from '@/lib/prisma';
import { requireCurrentOrganization } from '@/lib/tenant';

const categoryLabels: Record<string, string> = { LEAD: 'Prospecto', CLIENT: 'Cliente', RECURRING_CLIENT: 'Cliente recurrente', COLLABORATOR: 'Colaborador', AGENCY: 'Agencia', BUSINESS: 'Contacto comercial', BLOCKED: 'Bloqueado' };

export default async function Contacts() {
  const { organizationId } = await requireCurrentOrganization();
  const contacts = await prisma.contact.findMany({
    where: { organizationId }, orderBy: { updatedAt: 'desc' }, take: 100,
    include: { interactions: { orderBy: { occurredAt: 'desc' }, take: 5 }, tags: { include: { tag: true }, orderBy: { createdAt: 'asc' } }, consentRecords: { orderBy: { capturedAt: 'desc' }, take: 2 } },
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
        <small>No registres información íntima, datos de salud ni contenido explícito en las notas.</small>
      </section>
      <section className="section contact-list" aria-label="Directorio de contactos">
        {contacts.map((contact) => (
          <article className="card contact-card" key={contact.id}>
            <div className="contact-heading"><div><h2>{contact.displayName}</h2><small>{categoryLabels[contact.category] ?? contact.category}</small></div><DeleteContactForm id={contact.id} /></div>
            {contact.notes && <p>{contact.notes}</p>}
            <div className="tag-list">{contact.tags.map(({ tag }) => <span className="tag" key={tag.id}>{tag.name}</span>)}</div>
            <details className="contact-details">
              <summary>Editar ficha y registrar actividad</summary>
              <form action={updateContact} className="contact-form">
                <input type="hidden" name="id" value={contact.id} />
                <label>Nombre<input name="displayName" defaultValue={contact.displayName} required minLength={2} maxLength={120} /></label>
                <label>Categoría<select name="category" defaultValue={contact.category}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Notas<textarea name="notes" defaultValue={contact.notes ?? ''} maxLength={2000} rows={2} /></label>
                <button className="button" type="submit">Actualizar ficha</button>
              </form>
              <div className="contact-subsection"><strong>Etiquetas</strong><form action={addContactTag} className="inline-form"><input type="hidden" name="contactId" value={contact.id} /><input name="name" placeholder="Nueva etiqueta" minLength={2} maxLength={40} required /><button className="button secondary" type="submit">Agregar</button></form></div>
              <div className="contact-subsection"><strong>Registrar interacción</strong>
                <form action={addInteraction} className="contact-form"><input type="hidden" name="contactId" value={contact.id} /><select name="kind" defaultValue="NOTE"><option value="NOTE">Nota</option><option value="MESSAGE">Mensaje</option><option value="FOLLOW_UP">Seguimiento</option><option value="OTHER">Otra</option></select><textarea name="summary" placeholder="Resumen comercial" maxLength={500} rows={2} required /><button className="button secondary" type="submit">Guardar interacción</button></form>
                {contact.interactions.map((item) => <p className="interaction-item" key={item.id}><small>{item.occurredAt.toLocaleString('es-AR')} · {item.kind}</small><br />{item.summary}</p>)}
              </div>
              <div className="contact-subsection"><strong>Consentimiento de comunicación</strong>
                <form action={recordConsent} className="contact-form"><input type="hidden" name="contactId" value={contact.id} /><select name="purpose" defaultValue="MARKETING"><option value="MARKETING">Marketing</option><option value="COMMUNICATIONS">Comunicaciones</option></select><select name="status" defaultValue="PENDING"><option value="PENDING">Pendiente</option><option value="GRANTED">Otorgado</option><option value="WITHDRAWN">Retirado</option></select><input name="source" placeholder="Fuente del registro (opcional)" maxLength={120} /><button className="button secondary" type="submit">Registrar estado</button></form>
                {contact.consentRecords.map((record) => <small key={record.id}>{record.purpose}: {record.status} · {record.capturedAt.toLocaleDateString('es-AR')}</small>)}
              </div>
            </details>
          </article>
        ))}
        {contacts.length === 0 && <div className="card">Todavía no hay contactos en este workspace.</div>}
      </section>
      <footer>Los registros se consultan exclusivamente dentro del workspace autenticado. Se muestran hasta 100 contactos recientes.</footer>
    </>
  );
}