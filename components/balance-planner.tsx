"use client";

import { useMemo, useState } from "react";

import { generateBalancedTeams } from "@/lib/balance";
import type { PlayerRanking } from "@/lib/ranking";

function round(value: number) {
  return Number(value.toFixed(2));
}

type BalancePlannerProps = {
  rankings: PlayerRanking[];
};

export function BalancePlanner({ rankings }: BalancePlannerProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(rankings.map((player) => player.id));
  const [includeHybridRanking, setIncludeHybridRanking] = useState(true);
  const [showScores, setShowScores] = useState(true);

  function togglePlayer(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  const selectedPlayers = useMemo(
    () => rankings.filter((player) => selectedIds.includes(player.id)),
    [rankings, selectedIds],
  );

  const plannerPlayers = useMemo(
    () =>
      selectedPlayers.map((player) => {
        if (includeHybridRanking) {
          return player;
        }

        const overall = round((player.peerAttack + player.peerDefense) / 2);

        return {
          ...player,
          finalAttack: player.peerAttack,
          finalDefense: player.peerDefense,
          overall,
        };
      }),
    [includeHybridRanking, selectedPlayers],
  );

  const suggestions = useMemo(() => generateBalancedTeams(plannerPlayers, 3), [plannerPlayers]);
  const canGenerate = selectedPlayers.length >= 2;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-zinc-200 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Presentes
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Selecciona quienes juegan hoy y el motor arma las 3 mejores particiones.
            </p>
          </div>
          <div className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700">
            {selectedPlayers.length} jugadores
          </div>
        </div>

        <label className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <div>
            <p className="font-medium text-zinc-950">Incluir ranking hibrido</p>
            <p className="text-xs text-zinc-500">
              Si lo apagas, el armado usa solo puntajes de ataque y defensa votados.
            </p>
          </div>
          <input
            type="checkbox"
            checked={includeHybridRanking}
            onChange={() => setIncludeHybridRanking((current) => !current)}
            className="h-4 w-4 accent-emerald-500"
          />
        </label>

        <label className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <div>
            <p className="font-medium text-zinc-950">Mostrar puntajes</p>
            <p className="text-xs text-zinc-500">
              Oculta o muestra los valores al lado de cada jugador sin afectar el calculo.
            </p>
          </div>
          <input
            type="checkbox"
            checked={showScores}
            onChange={() => setShowScores((current) => !current)}
            className="h-4 w-4 accent-emerald-500"
          />
        </label>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {rankings.map((player) => {
            const checked = selectedIds.includes(player.id);
            const attack = includeHybridRanking ? player.finalAttack : player.peerAttack;
            const defense = includeHybridRanking ? player.finalDefense : player.peerDefense;

            return (
              <label
                key={player.id}
                className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition ${
                  checked
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-900"
                }`}
                >
                  <div>
                    <p className="font-medium">{player.name}</p>
                    {showScores ? (
                      <p className={`text-xs ${checked ? "text-zinc-300" : "text-zinc-500"}`}>
                        A {attack} | D {defense}
                      </p>
                    ) : null}
                  </div>
                  <input
                    type="checkbox"
                  checked={checked}
                  onChange={() => togglePlayer(player.id)}
                  className="h-4 w-4 accent-emerald-500"
                />
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Equipos sugeridos
        </h3>
        {!canGenerate ? (
          <p className="mt-4 text-sm text-zinc-600">Selecciona al menos 2 jugadores.</p>
        ) : suggestions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">No se pudo calcular una combinacion valida.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {suggestions.map((suggestion, index) => (
              <div key={`${suggestion.objective}-${index}`} className="rounded-3xl bg-zinc-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-zinc-950">Opcion {index + 1}</p>
                  <p className="text-xs text-zinc-500">
                    diff total {suggestion.objective} | A {suggestion.attackDiff} | D {suggestion.defenseDiff}
                  </p>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm font-semibold text-zinc-950">Equipo Negro</p>
                    <div className="mt-3 space-y-2 text-sm text-zinc-700">
                      {suggestion.teamBlack.map((player) => (
                        <div key={player.id} className="flex items-center justify-between">
                          <span>{player.name}</span>
                          {showScores ? <span className="text-zinc-500">{player.overall}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm font-semibold text-zinc-950">Equipo Blanco</p>
                    <div className="mt-3 space-y-2 text-sm text-zinc-700">
                      {suggestion.teamWhite.map((player) => (
                        <div key={player.id} className="flex items-center justify-between">
                          <span>{player.name}</span>
                          {showScores ? <span className="text-zinc-500">{player.overall}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
