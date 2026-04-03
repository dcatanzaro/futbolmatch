import Link from "next/link";
import { notFound } from "next/navigation";

import { RatingWizard } from "@/components/rating-wizard";
import { isValidPublicPassword } from "@/lib/auth";
import { getActivePlayers, getSessionBySlug } from "@/lib/db";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ password?: string }>;
};

export default async function RatingSessionPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const session = getSessionBySlug(slug);

  if (!session) {
    notFound();
  }

  const password = query.password ?? null;
  const isAuthorized = isValidPublicPassword(password);
  const players = getActivePlayers();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Futbolmatch ratings
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {session.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Puntua a todos los jugadores del 1 al 10 en ataque y defensa. El link es abierto, pero solo deja entrar con el password general enviado al grupo.
          </p>
        </div>

        {!isAuthorized ? (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-amber-950">Password requerido</h2>
            <p className="mt-3 text-sm leading-6 text-amber-900/80">
              Entra usando el parametro `?password=...` en la URL. Ejemplo:
            </p>
            <code className="mt-4 block overflow-x-auto rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-950">
              /rate/{session.slug}?password=tu-password
            </code>
            <p className="mt-4 text-sm text-amber-900/80">
              Si tenes el link correcto y no abre, pedi el password general otra vez.
            </p>
            <Link href="/" className="mt-6 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800">
              Volver al inicio
            </Link>
          </div>
        ) : session.status !== "open" ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-zinc-950">Sesion no disponible</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Esta sesion esta en estado <span className="font-medium">{session.status}</span>. Cuando la abras desde admin, el formulario vuelve a quedar disponible.
            </p>
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-zinc-950">No hay jugadores activos</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Carga jugadores desde el panel admin antes de abrir la encuesta.
            </p>
          </div>
        ) : (
          <RatingWizard
            players={players.map((player) => ({ id: player.id, name: player.name }))}
            sessionSlug={session.slug}
            sessionName={session.name}
            password={password!}
          />
        )}
      </div>
    </main>
  );
}
