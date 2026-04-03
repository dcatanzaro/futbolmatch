import {
  createMatch,
  createPlayerRecord,
  getMatchesBySource,
  getPlayers,
} from "@/lib/db";

const HISTORICAL_SOURCE = "image-2026-initial-history";

type RawMatch = {
  label: string;
  winnerSide: "black" | "white";
  black: string[];
  white: string[];
};

const rawMatches: RawMatch[] = [
  {
    label: "Fecha 1",
    winnerSide: "black",
    black: ["Camilo", "Tomi", "Fran", "Dami", "Waiki"],
    white: ["Chino", "Chero", "Lazio", "Griego", "Saul"],
  },
  {
    label: "Fecha 2",
    winnerSide: "black",
    black: ["Lazio", "Fran", "Iani", "Juance", "Nacho", "Charly", "Dami", "Waiki"],
    white: ["Camilo", "Marcos", "Jocha", "Guido", "Chero", "Chino", "Saul", "Griego"],
  },
  {
    label: "Fecha 3",
    winnerSide: "white",
    black: ["Camilo", "Jocha", "Guido", "Chero", "Charly"],
    white: ["Lazio", "JP", "Fran", "Dami", "Saul"],
  },
  {
    label: "Fecha 4",
    winnerSide: "black",
    black: ["Camilo", "Guido", "Marcos", "Lazio", "Dami"],
    white: ["Fran", "Charly", "Jr", "JP", "Chero"],
  },
  {
    label: "Fecha 5",
    winnerSide: "black",
    black: ["Chero", "Charly", "Maikol", "JP", "Dami"],
    white: ["Camilo", "Jocha", "Tanque", "Waiki", "Fran"],
  },
  {
    label: "Fecha 6",
    winnerSide: "black",
    black: ["JP", "Manu (JP)", "Fran", "Maikol", "Dami"],
    white: ["Camilo", "Jocha", "Saul", "Waiki", "Charly"],
  },
  {
    label: "Fecha 7",
    winnerSide: "white",
    black: ["JP", "Maikol", "Fran", "Dami", "POL"],
    white: ["Camilo", "Chero", "Griego", "Waiki", "Charly"],
  },
  {
    label: "Fecha 8",
    winnerSide: "black",
    black: ["JP", "Manu (JP)", "Dami", "Charly", "Fran"],
    white: ["Griego", "Saul", "Waiki", "Camilo", "Chero"],
  },
  {
    label: "Fecha 9",
    winnerSide: "black",
    black: ["JP", "Manu (JP)", "Camilo", "Saul", "Griego"],
    white: ["Dami", "Maikol", "Waiki", "Charly", "Fran (Saul)"],
  },
  {
    label: "Fecha 10",
    winnerSide: "black",
    black: ["Camilo", "Saul", "Charly", "Waiki", "Dami"],
    white: ["JP", "Manu (JP)", "Pol", "Griego", "Fran"],
  },
  {
    label: "Fecha 11",
    winnerSide: "white",
    black: ["Chero", "Lazio", "Dami", "Pol", "Iani", "Juance", "Nacho", "Charly"],
    white: ["Camilo", "Tom", "Griego", "JP", "Waiki", "Saul", "Juan Migone"],
  },
  {
    label: "Fecha 12",
    winnerSide: "white",
    black: ["JP", "Fran", "Saul", "Pol", "Chero"],
    white: ["Camilo", "Manu (JP)", "Griego", "Waiki", "Dami"],
  },
];

const aliases: Record<string, string> = {
  Dami: "Damián",
  Tomi: "Tom",
  Griego: "Greek",
  POL: "Pol",
  Jr: "Junior",
  "Manu (JP)": "Manu JP",
  "Fran (Saul)": "Fran",
};

function normalizeName(name: string) {
  return aliases[name] ?? name;
}

export function seedHistoricalMatchesFromImage() {
  const existing = getMatchesBySource(HISTORICAL_SOURCE);
  if (existing.length > 0) {
    return { created: 0, skipped: existing.length, source: HISTORICAL_SOURCE };
  }

  const players = getPlayers();
  const byName = new Map(players.map((player) => [player.name, player.id]));

  const allNames = new Set(
    rawMatches.flatMap((match) => [...match.black, ...match.white].map(normalizeName)),
  );

  for (const name of allNames) {
    if (!byName.has(name)) {
      const player = createPlayerRecord(name, false);
      if (player) {
        byName.set(player.name, player.id);
      }
    }
  }

  let created = 0;

  for (const match of rawMatches) {
    const blackPlayerIds = match.black
      .map(normalizeName)
      .map((name) => byName.get(name))
      .filter((id): id is number => typeof id === "number");
    const whitePlayerIds = match.white
      .map(normalizeName)
      .map((name) => byName.get(name))
      .filter((id): id is number => typeof id === "number");

    if (blackPlayerIds.length === 0 || whitePlayerIds.length === 0) {
      continue;
    }

    createMatch({
      label: match.label,
      season: "Torneo 2026",
      source: HISTORICAL_SOURCE,
      winnerSide: match.winnerSide,
      blackPlayerIds,
      whitePlayerIds,
    });

    created += 1;
  }

  return { created, skipped: 0, source: HISTORICAL_SOURCE };
}

export const historicalSeedSource = HISTORICAL_SOURCE;
