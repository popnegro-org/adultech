# IvanaCain — Adult Creator CRM

SaaS B2C/B2B para creadores adultos independientes de Argentina y Latinoamérica, con expansión posterior a agencias.

## Alcance y límites
- **P0 SaaS Core:** Auth.js Credentials, workspaces, tenancy, roles y auditoría.
- **P0 Creator CRM:** directorio de contactos, categorías, notas y registro de creación.
- **P0 Privacy Center:** acceso autenticado y aislamiento por organización; exportación, eliminación y consentimientos pendientes.
- **P1 Marketing Hub:** campañas, calendario editorial, enlaces UTM y métricas.
- **P1 Revenue Tracker:** registro manual de ingresos y gastos externos.
- **P2 Agency Manager:** equipos y gestión de múltiples perfiles.

IvanaCain no aloja ni distribuye contenido explícito y no procesa pagos por contenido adulto. Los ingresos de plataformas externas se registran de forma informativa. La facturación SaaS requiere aprobación expresa del proveedor de pagos para este vertical.

## Stack
Next.js App Router + TypeScript, PostgreSQL + Prisma, Auth.js, bcryptjs, Zod y CSS responsive. Despliegue previsto en Vercel.

## Desarrollo local
```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:validate
npm run typecheck
npm run lint
npm run build
```
Configurar DATABASE_URL con PostgreSQL propio y generar AUTH_SECRET con `npx auth secret`. No guardar secretos reales en el repositorio. Las migraciones de producción requieren revisión y aprobación humana.

## Estado de implementación
- Landing pública y dashboard autenticado.
- Registro de cuenta con contraseña hasheada mediante bcryptjs y confirmación de mayoría de edad.
- Auth.js Credentials con sesión JWT cifrada en cookie HttpOnly.
- Creación transaccional de workspace y membresía OWNER.
- Resolución de organización desde la sesión autenticada; no acepta organizationId ni userId controlados por el navegador.
- Alta y listado de contactos acotados por organizationId en servidor.
- Auditoría de creación de contactos.
- Secciones de campañas, analítica, ingresos y configuración marcadas como pendientes; no simulan datos reales.

## Pendientes antes de beta
- Rate limiting y protección anti-abuso para registro e inicio de sesión.
- Recuperación/verificación de correo y política de sesiones.
- CRUD completo de contactos, interacciones, etiquetas y consentimiento.
- Exportación y eliminación verificables.
- Migraciones versionadas y lockfile npm reproducible.
- Tests unitarios/integración, incluyendo aislamiento multi-tenant y autorización.
- Auditoría de seguridad, QA responsive/visual y Preview de Vercel.
- Configuración de variables de entorno en el proveedor de hosting.

## Privacidad y seguridad
Toda consulta de negocio debe acotarse por organizationId obtenido de la membresía del usuario autenticado en servidor. No confiar en IDs enviados por el cliente. No almacenar contenido explícito, contraseñas de plataformas externas ni información íntima innecesaria de contactos. Aplicar mínimo privilegio, auditoría y portabilidad/eliminación por workspace.

## Human Gate
No fusionar a main ni desplegar a producción hasta completar y verificar las pruebas de autorización, aislamiento, privacidad, migraciones y seguridad.