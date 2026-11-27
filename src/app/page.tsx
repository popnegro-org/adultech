import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing">
      <div className="brand">
        <b className="brand-mark">A</b>
        <div>Adultech<small>Adult Creator CRM</small></div>
      </div>
      <section className="hero">
        <div className="eyebrow">Creator business platform · LATAM</div>
        <h1>Tu negocio.<br />Tu audiencia. Tu control.</h1>
        <p>El sistema de gestión comercial para creadores de contenido adulto. Organizá contactos, campañas y métricas desde un solo lugar, con privacidad desde el diseño.</p>
        <Link className="button" href="/dashboard">Explorar demostración</Link>
      </section>
      <section className="features">
        {[
          ['Creator CRM', 'Contactos, etiquetas, historial y seguimiento comercial.'],
          ['Marketing Hub', 'Campañas, calendario y enlaces medibles.'],
          ['Analytics', 'Indicadores para tomar decisiones informadas.'],
          ['Privacy Center', 'Control de acceso y datos separados por workspace.'],
        ].map(([heading, description]) => (
          <article className="card" key={heading}>
            <h2>{heading}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>
      <footer>Plataforma SaaS para mayores de 18 años. Adultech no aloja ni distribuye contenido explícito y no procesa pagos por contenido de terceros.</footer>
    </main>
  );
}
