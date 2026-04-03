"use client";

import { useState } from "react";

type Player = {
  id: number;
  name: string;
  active: number;
};

type Session = {
  id: number;
  name: string;
  slug: string;
  status: "draft" | "open" | "closed";
};

type AdminFormsProps = {
  adminPassword: string;
  publicPassword: string;
  players: Player[];
  sessions: Session[];
};

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "La operacion fallo.");
  }
}

export function AdminForms({ adminPassword, publicPassword, players, sessions }: AdminFormsProps) {
  const [playerName, setPlayerName] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function createPlayer() {
    setLoading("player");
    setError(null);

    try {
      await postJson("/api/admin/players", { password: adminPassword, name: playerName });
      window.location.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear el jugador.");
    } finally {
      setLoading(null);
    }
  }

  async function togglePlayer(id: number, active: boolean) {
    setLoading(`player-${id}`);
    setError(null);

    try {
      await postJson("/api/admin/players/toggle", {
        password: adminPassword,
        id,
        active: !active,
      });
      window.location.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo actualizar el jugador.");
    } finally {
      setLoading(null);
    }
  }

  async function createSession() {
    setLoading("session");
    setError(null);

    try {
      await postJson("/api/admin/sessions", {
        password: adminPassword,
        name: sessionName,
      });
      window.location.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la sesion.");
    } finally {
      setLoading(null);
    }
  }

  async function updateSession(id: number, status: Session["status"]) {
    setLoading(`session-${id}`);
    setError(null);

    try {
      await postJson("/api/admin/sessions/status", {
        password: adminPassword,
        id,
        status,
      });
      window.location.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo actualizar la sesion.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Jugadores</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Agrega jugadores nuevos y activa o desactiva perfiles sin borrar historial.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Nombre del jugador"
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
          />
          <button
            type="button"
            onClick={createPlayer}
            disabled={!playerName.trim() || loading !== null}
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading === "player" ? "Guardando..." : "Agregar"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3">
              <div>
                <p className="font-medium text-zinc-950">{player.name}</p>
                <p className="text-xs text-zinc-500">{player.active ? "Activo" : "Inactivo"}</p>
              </div>
              <button
                type="button"
                onClick={() => togglePlayer(player.id, Boolean(player.active))}
                disabled={loading !== null}
                className="rounded-full border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 disabled:opacity-50"
              >
                {player.active ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Sesiones</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Crea una votacion nueva y cambiale el estado para abrir o cerrar el link publico.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={sessionName}
            onChange={(event) => setSessionName(event.target.value)}
            placeholder="Ej: Apertura abril 2026"
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
          />
          <button
            type="button"
            onClick={createSession}
            disabled={!sessionName.trim() || loading !== null}
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading === "session" ? "Creando..." : "Crear sesion"}
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-2xl border border-zinc-200 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-medium text-zinc-950">{session.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {`/rate/${session.slug}?password=${publicPassword}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateSession(session.id, "draft")}
                    disabled={loading !== null}
                    className="rounded-full border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 disabled:opacity-50"
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSession(session.id, "open")}
                    disabled={loading !== null}
                    className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 disabled:opacity-50"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSession(session.id, "closed")}
                    disabled={loading !== null}
                    className="rounded-full border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">Estado actual: {session.status}</p>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
