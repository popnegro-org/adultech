import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'IvanaCain — Adult Creator CRM', description: 'El sistema de gestión comercial para creadores de contenido adulto.', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es-AR"><body>{children}</body></html>; }
