# IvanaCain — Adult Creator CRM

SaaS B2C/B2B para creadores adultos independientes de Argentina y Latinoamérica, con expansión posterior a agencias.

## Alcance y límites
- **P0 SaaS Core:** Auth.js Credentials, workspaces, tenancy, roles y auditoría.
- **P0 Creator CRM:** alta, edición y eliminación de contactos; categorías, notas, etiquetas e historial de interacciones.
- **P0 Privacy Center:** acceso autenticado, aislamiento por organización, registro de consentimientos y exportación CSV auditada. La eliminación de solicitudes de datos sigue pendiente.
- **P1 Marketing Hub:** campañas, calendario editorial, enlaces UTM y métricas.
- **P1 Revenue Tracker:** registro manual de ingresos y gastos externos.
- **P2 Agency Manager:** equipos y gestión de múltiples perfiles.

IvanaCain no aloja ni distribuye contenido explícito y no procesa pagos por contenido adulto. Los ingresos de plataformas externas se registran de forma informativa. La facturación SaaS requiere aprobación expresa del proveedor de pagos para este vertical.

## Stack
Next.js App Router + TypeScript, PostgreSQL + Prisma, Auth.js, bcryptjs, Zod y CSS responsive. Despliegue previsto en Vercel.

## Desarrollo local
```bash
cp .env.example .env
npm ci
npm run db:generate
npm run db:validate
npm run typecheck
npm run lint
npm run build
```
Configurar DATABASE_URL con PostgreSQL propio y generar AUTH_SECRET con `npx auth secret`. No guardar secretos reales en el repositorio. Las migraciones de producción requieren revisión y aprobación humana.

## Estado de implementación
- Landing pública y dashboard autenticado.
- Registro local con contraseña hasheada mediante bcryptjs y confirmación de mayoría de edad. En entornos alojados (NODE_ENV=production) el alta pública permanece deshabilitada hasta implementar verificación de correo. La API de desarrollo devuelve HTTP 202 y el mismo cuerpo ante creación y conflicto de email único; aplica rate limiting persistente por IP y email con claves HMAC-SHA256. El flujo no inicia sesión automáticamente después del alta.
- Auth.js Credentials con sesión JWT cifrada en cookie HttpOnly; los intentos con emails inexistentes realizan una comparación bcrypt de costo equivalente para reducir enumeración por tiempo.
- Creación transaccional de workspace y membresía OWNER.
- Resolución de organización desde la sesión autenticada; no acepta organizationId ni userId controlados por el navegador. El PMV rechaza sesiones con múltiples membresías hasta implementar un selector explícito de workspace, en lugar de elegir una organización arbitrariamente.
- Escrituras del Creator CRM restringidas en servidor a OWNER, ADMIN y MANAGER; MEMBER queda sin permisos de mutación.
- CRUD de contactos, etiquetas, interacciones y registros append-only de consentimiento, acotados por organizationId.
- Integridad referencial multi-tenant reforzada en PostgreSQL: las asignaciones de etiquetas y los consentimientos no pueden vincular registros de organizaciones distintas, incluso ante escrituras fuera de la aplicación.
- Exportación CSV de contactos y exportación JSON completa del workspace (cuenta, miembros, contactos, interacciones, etiquetas, consentimientos, campañas y auditoría), ambas auditadas; la exportación completa requiere OWNER/ADMIN.
- `package-lock.json` versionado; CI instala dependencias mediante `npm ci` y `npm audit --audit-level=high` reporta 0 vulnerabilidades en el lockfile actual.
- Secciones de campañas, analítica, ingresos y configuración marcadas como pendientes; no simulan datos reales.

## Pendientes antes de beta
- Verificación/recuperación de correo y política de sesiones. El alta sin verificación solo está disponible en desarrollo local; no se habilita registro en entornos alojados hasta implementar confirmación del buzón.
- Solicitudes completas de acceso, exportación y eliminación de datos personales.
- Tests de sesión y autorización por rol, además del smoke test de aislamiento multi-tenant, rechazo de referencias cruzadas y cascadas.
- Auditoría de seguridad y pruebas E2E de sesión/autorización. CI incluye smoke HTTP de la página de login y del endpoint de registro alojado.
- QA funcional/visual autenticado y configuración de variables de entorno en Preview.

## Privacidad y seguridad
Toda consulta de negocio debe acotarse por organizationId obtenido de la membresía del usuario autenticado en servidor. No confiar en IDs enviados por el cliente. No almacenar contenido explícito, contraseñas de plataformas externas ni información íntima innecesaria de contactos. Aplicar mínimo privilegio, auditoría y portabilidad/eliminación por workspace.

## Human Gate
No fusionar a main ni desplegar a producción hasta completar y verificar las pruebas de autorización, aislamiento, privacidad, migraciones y seguridad.