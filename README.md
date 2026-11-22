# IvanaCain — Adult Creator CRM

SaaS B2B2C para creadores adultos independientes y, en fases posteriores, agencias de Argentina y Latinoamérica.

## Alcance PMV
- **P0 SaaS Core:** autenticación, workspaces, aislamiento multi-tenant, roles y auditoría.
- **P0 Creator CRM:** directorio, categorías, notas, interacciones, búsqueda y exportación.
- **P0 Privacy Center:** consentimiento, portabilidad, eliminación y control de acceso.
- **P1 Marketing Hub:** campañas, calendario, enlaces UTM y métricas.
- **P1 Revenue Tracker:** registro manual de ingresos y gastos externos.
- **P2 Agency Manager:** equipos y gestión de múltiples perfiles.

IvanaCain no aloja ni distribuye contenido explícito y no procesa pagos por contenido adulto. Los ingresos de plataformas externas se registran de forma informativa. La facturación SaaS requiere aprobación expresa del proveedor de pagos para este vertical.

## Stack
Next.js App Router + TypeScript, PostgreSQL + Prisma, Auth.js (pendiente de configurar antes de habilitar acceso real), CSS inicial (Tailwind/shadcn previsto), Vercel.

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
Configurar DATABASE_URL con PostgreSQL propio. No ejecutar migraciones en producción sin revisión y aprobación humana. Nunca guardar secretos reales en el repositorio.

## Estado
Esta primera rama contiene landing, dashboard de demostración, listado de contactos ficticios, esquema relacional inicial y helper de autorización de membresía. Autenticación, persistencia funcional, mutaciones, consentimiento, exportación e integraciones aún no están habilitados. Las pantallas demo no representan datos reales.

## Visual QA
El proyecto Vercel `ivanacain` está vinculado al repositorio. La rama candidata `feat/ivana-cain-pmv-foundation` genera despliegues Preview para revisión visual; `main` es la rama de producción y no debe recibir cambios hasta completar la aprobación correspondiente. El Preview es una demostración visual, no un servicio listo para usuarios ni una validación de seguridad.

## Seguridad y privacidad
Toda consulta de negocio debe acotarse por organizationId validado contra la membresía del usuario autenticado. No confiar en organizationId enviado por el cliente sin verificar membresía en servidor. No almacenar contenido explícito, contraseñas de plataformas externas ni información íntima innecesaria de contactos. Aplicar mínimo privilegio, auditoría y portabilidad/eliminación por workspace.
