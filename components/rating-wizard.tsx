"use client";

import { useEffect, useMemo, useState } from "react";

type Player = {
  id: number;
  name: string;
};

type RatingWizardProps = {
  players: Player[];
  sessionSlug: string;
  sessionName: string;
  password: string;
};

type ScoreMap = Record<number, { attack: number; defense: number }>;

function shufflePlayers(players: Player[], seed: string) {
  const items = [...players];
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  for (let index = items.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const swapIndex = hash % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function getStorageKey(slug: string) {
  return `rating-session:${slug}`;
}

export function RatingWizard({
  players,
  sessionSlug,
  sessionName,
  password,
}: RatingWizardProps) {
  const [orderSeed, setOrderSeed] = useState<string>("");
  const [scores, setScores] = useState<ScoreMap>({});
  const [index, setIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const storageKey = getStorageKey(sessionSlug);
    const savedState = window.localStorage.getItem(storageKey);

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState) as {
          orderSeed?: string;
          scores?: ScoreMap;
          index?: number;
          submitted?: boolean;
        };

        setOrderSeed(parsed.orderSeed || crypto.randomUUID());
        setScores(parsed.scores || {});
        setIndex(parsed.index || 0);
        setSubmitted(Boolean(parsed.submitted));
        return;
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setOrderSeed(crypto.randomUUID());
  }, [sessionSlug]);

  useEffect(() => {
    if (!orderSeed) {
      return;
    }

    window.localStorage.setItem(
      getStorageKey(sessionSlug),
      JSON.stringify({ orderSeed, scores, index, submitted }),
    );
  }, [index, orderSeed, scores, sessionSlug, submitted]);

  const orderedPlayers = useMemo(() => {
    if (!orderSeed) {
      return players;
    }

    return shufflePlayers(players, orderSeed);
  }, [orderSeed, players]);

  const currentPlayer = orderedPlayers[index];
  const currentScore = currentPlayer
    ? scores[currentPlayer.id] ?? { attack: 5, defense: 5 }
    : null;

  function updateScore(playerId: number, field: "attack" | "defense", value: number) {
    setScores((previous) => ({
      ...previous,
      [playerId]: {
        attack: previous[playerId]?.attack ?? 5,
        defense: previous[playerId]?.defense ?? 5,
        [field]: value,
      },
    }));
  }

  async function submitRatings() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const answers = orderedPlayers.map((player) => {
        const playerScore = scores[player.id] ?? { attack: 5, defense: 5 };

        return {
          playerId: player.id,
          attackScore: playerScore.attack,
          defenseScore: playerScore.defense,
        };
      });

      const response = await fetch(`/api/rate/${sessionSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, answers }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "No se pudo guardar la votacion.");
      }

      setSubmitted(true);
      window.localStorage.removeItem(getStorageKey(sessionSlug));
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "No se pudo guardar la votacion.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-950 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
          Votacion enviada
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Gracias por completar la encuesta</h2>
        <p className="mt-3 text-sm text-emerald-800/80">
          Tus puntajes de ataque y defensa para {sessionName} quedaron guardados.
        </p>
      </div>
    );
  }

  if (!currentPlayer || !currentScore) {
    return null;
  }

  const isLastStep = index === orderedPlayers.length - 1;
  const progress = Math.round(((index + 1) / orderedPlayers.length) * 100);

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 text-sm text-zinc-500">
          <span>
            Jugador {index + 1} de {orderedPlayers.length}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-zinc-950 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="rounded-[2rem] bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 p-[1px] shadow-xl">
        <div className="rounded-[calc(2rem-1px)] bg-white p-8">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
            Evaluando a
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
            {currentPlayer.name}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
            Puntualo del 1 al 10. Pensalo como nivel de impacto ofensivo y solidez defensiva en un partido normal.
          </p>

          <div className="mt-10 space-y-8">
            <label className="block">
              <div className="mb-3 flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-zinc-900">Ataque</span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900">
                  {currentScore.attack}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={currentScore.attack}
                onChange={(event) => updateScore(currentPlayer.id, "attack", Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-emerald-600"
              />
              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>1</span>
                <span>10</span>
              </div>
            </label>

            <label className="block">
              <div className="mb-3 flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-zinc-900">Defensa</span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900">
                  {currentScore.defense}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={currentScore.defense}
                onChange={(event) => updateScore(currentPlayer.id, "defense", Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-sky-600"
              />
              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>1</span>
                <span>10</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0 || isSubmitting}
          className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Atras
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={submitRatings}
            disabled={isSubmitting}
            className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Enviando..." : "Enviar votacion"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((current) => Math.min(orderedPlayers.length - 1, current + 1))}
            disabled={isSubmitting}
            className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Siguiente
          </button>
        )}
      </div>

      {submitError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </p>
      ) : null}
    </div>
  );
}
