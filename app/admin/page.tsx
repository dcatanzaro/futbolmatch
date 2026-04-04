import Link from "next/link";

import { AdminForms } from "@/components/admin-forms";
import { BalancePlanner } from "@/components/balance-planner";
import { DeleteSubmissionButton } from "@/components/delete-submission-button";
import { getPublicPassword, isValidAdminPassword } from "@/lib/auth";
import {
  getDuplicateIps,
  getMatchCount,
  getPlayers,
  getSessions,
  getSessionSummary,
  getSubmissionAudit,
} from "@/lib/db";
import { getPlayerRankings } from "@/lib/ranking";

type PageProps = {
  searchParams: Promise<{ password?: string; session?: string }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const password = query.password ?? null;

  if (!isValidAdminPassword(password)) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Acceso restringido</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Entra con `?password=...` para administrar jugadores, sesiones y submissions.
          </p>
        </div>
      </main>
    );
  }

  const adminPassword = password as string;
  const publicPassword = getPublicPassword();

  const players = getPlayers();
  const sessions = getSessions();
  const selectedSession = sessions.find((session) => session.slug === query.session) ?? sessions[0] ?? null;
  const summary = selectedSession ? getSessionSummary(selectedSession.id) : [];
  const audit = selectedSession ? getSubmissionAudit(selectedSession.id) : [];
  const duplicateIps = selectedSession ? getDuplicateIps(selectedSession.id) : [];
  const rankings = getPlayerRankings(selectedSession?.id ?? null);
  const totalMatches = getMatchCount();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#0a0a0a_0%,#111827_100%)] px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
            Futbolmatch admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            Jugadores, sesiones y auditoria
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
            El formulario publico queda abierto por link con `?password=` y las submissions se guardan siempre, sin bloquear duplicados. Aca podes revisar resultados y detectar IPs repetidas despues.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-500">
            <span className="rounded-full bg-zinc-100 px-3 py-2">{totalMatches} partidos historicos</span>
            <span className="rounded-full bg-zinc-100 px-3 py-2">fuente: imagen torneo 2026</span>
          </div>
        </section>

        <AdminForms
          adminPassword={adminPassword}
          publicPassword={publicPassword}
          players={players}
          sessions={sessions}
        />

        <section className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Resultados por sesion</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Mira promedios por jugador y submissions guardadas para una sesion concreta.
              </p>
            </div>
            {selectedSession ? (
              <Link
                href={`/rate/${selectedSession.slug}?password=${encodeURIComponent(publicPassword)}`}
                className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950"
              >
                Abrir link publico
              </Link>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/admin?password=${encodeURIComponent(adminPassword)}&session=${encodeURIComponent(session.slug)}`}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  selectedSession?.id === session.id
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:text-zinc-950"
                }`}
              >
                {session.name}
              </Link>
            ))}
          </div>

          {!selectedSession ? (
            <p className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Todavia no hay sesiones creadas.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <div className="overflow-hidden rounded-3xl border border-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                  <thead className="bg-zinc-50 text-left text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Jugador</th>
                      <th className="px-4 py-3 font-medium">Votos</th>
                      <th className="px-4 py-3 font-medium">Ataque</th>
                      <th className="px-4 py-3 font-medium">Defensa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {summary.map((row) => (
                      <tr key={row.player_id}>
                        <td className="px-4 py-3 font-medium text-zinc-950">{row.player_name}</td>
                        <td className="px-4 py-3 text-zinc-600">{row.votes}</td>
                        <td className="px-4 py-3 text-zinc-600">{row.avg_attack ?? "-"}</td>
                        <td className="px-4 py-3 text-zinc-600">{row.avg_defense ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-zinc-200 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    IPs duplicadas
                  </h3>
                  {duplicateIps.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-600">No hay IPs repetidas en esta sesion.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {duplicateIps.map((item) => (
                        <div key={item.submitted_ip} className="rounded-2xl bg-zinc-50 px-4 py-3">
                          <p className="font-medium text-zinc-950">{item.submitted_ip}</p>
                          <p className="text-xs text-zinc-500">{item.submissions} submissions</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-zinc-200 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Ultimas submissions
                  </h3>
                  <div className="mt-4 space-y-3">
                    {audit.length === 0 ? (
                      <p className="text-sm text-zinc-600">Todavia no hay submissions.</p>
                    ) : (
                      audit.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-zinc-950">Submission #{item.id}</p>
                            <DeleteSubmissionButton
                              adminPassword={adminPassword}
                              id={item.id}
                            />
                          </div>
                          <p className="mt-1">IP: {item.submitted_ip || "No detectada"}</p>
                          <p>Respuestas: {item.answers_count}</p>
                          <p>Fecha: {item.created_at}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Ranking hibrido</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Mezcla la encuesta de ataque/defensa con un historial Elo basado en victorias y derrotas del 2026 cargado desde la imagen.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Jugador</th>
                  <th className="px-4 py-3 font-medium">Peer A</th>
                  <th className="px-4 py-3 font-medium">Peer D</th>
                  <th className="px-4 py-3 font-medium">Hist</th>
                  <th className="px-4 py-3 font-medium">PJ</th>
                  <th className="px-4 py-3 font-medium">W-L</th>
                  <th className="px-4 py-3 font-medium">Final A</th>
                  <th className="px-4 py-3 font-medium">Final D</th>
                  <th className="px-4 py-3 font-medium">Overall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {rankings.map((player) => (
                  <tr key={player.id}>
                    <td className="px-4 py-3 font-medium text-zinc-950">{player.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{player.peerAttack}</td>
                    <td className="px-4 py-3 text-zinc-600">{player.peerDefense}</td>
                    <td className="px-4 py-3 text-zinc-600">{player.historicalRating}</td>
                    <td className="px-4 py-3 text-zinc-600">{player.matchesPlayed}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {player.wins}-{player.losses}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{player.finalAttack}</td>
                    <td className="px-4 py-3 text-zinc-600">{player.finalDefense}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-950">{player.overall}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-zinc-950">Armado de equipos</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Selecciona los presentes y se calculan las 3 mejores particiones segun ataque, defensa y overall. Puedes incluir o no el ranking hibrido.
          </p>
          <div className="mt-6">
            <BalancePlanner rankings={rankings} />
          </div>
        </section>
      </div>
    </main>
  );
}
