const CONTACT_WRITE_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER']);

/** @param {string} role */
export function canWriteContacts(role) {
  return CONTACT_WRITE_ROLES.has(role);
}
