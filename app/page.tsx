export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_45%,#e2e8f0_100%)] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-[2rem] bg-zinc-950 px-8 py-10 text-white shadow-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            Futbolmatch
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Ratings anonimos para armar equipos mas justos
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
            Cada jugador puntua a todos en ataque y defensa desde un link publico con password general. Las submissions se guardan con IP para poder auditar duplicados despues.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-zinc-950">1. Crear jugadores</p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Carga la lista del grupo y deja inactivos a los que no quieras mostrar en una sesion.
            </p>
          </article>
          <article className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-zinc-950">2. Abrir una sesion</p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Crea una votacion, abrila y comparti el link `/rate/[slug]?password=...` por el grupo.
            </p>
          </article>
          <article className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-zinc-950">3. Revisar resultados</p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Desde admin ves promedios por jugador, submissions guardadas e IPs duplicadas.
            </p>
          </article>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Punto de entrada</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            El panel de administracion usa el mismo formato de password por query string. Si no definis variables de entorno, la app arranca con un password por defecto para desarrollo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-medium">
            <a
              href="/admin?password=futbol-lunes"
              className="rounded-full bg-zinc-950 px-5 py-3 text-white transition hover:bg-zinc-800"
            >
              Ir a admin
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
