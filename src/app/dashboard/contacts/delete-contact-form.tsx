'use client';

import { deleteContact } from './actions';

export default function DeleteContactForm({ id }: { id: string }) {
  return (
    <form action={deleteContact}>
      <input type="hidden" name="id" value={id} />
      <button
        className="auth-switch danger-action"
        type="submit"
        onClick={(event) => {
          if (!window.confirm('¿Eliminar este contacto y su historial asociado? Esta acción no se puede deshacer.')) {
            event.preventDefault();
          }
        }}
      >
        Eliminar
      </button>
    </form>
  );
}
