import {
  getActivePlayers,
  getLatestSessionWithSubmissions,
  getMatchesWithPlayers,
  getPeerRatings,
} from "@/lib/db";

export type PlayerRanking = {
  id: number;
  name: string;
  peerAttack: number;
  peerDefense: number;
  votes: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  historicalRating: number;
  historyWeight: number;
  finalAttack: number;
  finalDefense: number;
  overall: number;
};

type MatchModel = {
  id: number;
  winnerSide: "black" | "white" | "draw";
  blackPlayerIds: number[];
  whitePlayerIds: number[];
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function scaleToOneTen(value: number, min: number, max: number) {
  if (max === min) {
    return 5.5;
  }

  return 1 + ((value - min) / (max - min)) * 9;
}

function expectedScore(blackRating: number, whiteRating: number) {
  return 1 / (1 + 10 ** ((whiteRating - blackRating) / 400));
}

function buildMatchModels() {
  const rows = getMatchesWithPlayers();
  const matches = new Map<number, MatchModel>();

  for (const row of rows) {
    const current = matches.get(row.match_id) ?? {
      id: row.match_id,
      winnerSide: row.winner_side,
      blackPlayerIds: [],
      whitePlayerIds: [],
    };

    if (row.team_side === "black") {
      current.blackPlayerIds.push(row.player_id);
    } else {
      current.whitePlayerIds.push(row.player_id);
    }

    matches.set(row.match_id, current);
  }

  return [...matches.values()].sort((a, b) => a.id - b.id);
}

function computeHistoricalRatings(playerIds: number[]) {
  const matches = buildMatchModels();
  const ratings = new Map<number, number>();
  const stats = new Map<number, { matchesPlayed: number; wins: number; losses: number }>();

  for (const playerId of playerIds) {
    ratings.set(playerId, 1500);
    stats.set(playerId, { matchesPlayed: 0, wins: 0, losses: 0 });
  }

  for (const match of matches) {
    const black = match.blackPlayerIds.filter((playerId) => ratings.has(playerId));
    const white = match.whitePlayerIds.filter((playerId) => ratings.has(playerId));

    if (black.length === 0 || white.length === 0) {
      continue;
    }

    const blackRating = black.reduce((total, playerId) => total + (ratings.get(playerId) ?? 1500), 0) / black.length;
    const whiteRating = white.reduce((total, playerId) => total + (ratings.get(playerId) ?? 1500), 0) / white.length;
    const expectedBlack = expectedScore(blackRating, whiteRating);
    const actualBlack =
      match.winnerSide === "black" ? 1 : match.winnerSide === "white" ? 0 : 0.5;
    const delta = 28 * (actualBlack - expectedBlack);

    for (const playerId of black) {
      ratings.set(playerId, (ratings.get(playerId) ?? 1500) + delta);
      const current = stats.get(playerId);
      if (!current) {
        continue;
      }

      current.matchesPlayed += 1;
      if (match.winnerSide === "black") {
        current.wins += 1;
      } else if (match.winnerSide === "white") {
        current.losses += 1;
      }
    }

    for (const playerId of white) {
      ratings.set(playerId, (ratings.get(playerId) ?? 1500) - delta);
      const current = stats.get(playerId);
      if (!current) {
        continue;
      }

      current.matchesPlayed += 1;
      if (match.winnerSide === "white") {
        current.wins += 1;
      } else if (match.winnerSide === "black") {
        current.losses += 1;
      }
    }
  }

  const values = [...ratings.values()];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const normalized = new Map<number, number>();

  for (const [playerId, value] of ratings.entries()) {
    normalized.set(playerId, round(scaleToOneTen(value, min, max)));
  }

  return { normalized, stats };
}

export function getPlayerRankings(sessionId?: number | null) {
  const activePlayers = getActivePlayers();
  const fallbackSession = getLatestSessionWithSubmissions();
  const effectiveSessionId = sessionId ?? fallbackSession?.id ?? null;
  const peerRows = effectiveSessionId ? getPeerRatings(effectiveSessionId) : [];
  const peerByPlayerId = new Map(peerRows.map((row) => [row.player_id, row]));
  const historical = computeHistoricalRatings(activePlayers.map((player) => player.id));

  return activePlayers
    .map<PlayerRanking>((player) => {
      const peer = peerByPlayerId.get(player.id);
      const peerAttack = peer?.avg_attack ?? 5;
      const peerDefense = peer?.avg_defense ?? 5;
      const votes = peer?.votes ?? 0;
      const history = historical.stats.get(player.id) ?? {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
      };
      const historicalRating = historical.normalized.get(player.id) ?? 5;
      const historyWeight = history.matchesPlayed === 0 ? 0 : Math.min(0.45, (history.matchesPlayed / 8) * 0.45);
      const finalAttack = round(peerAttack * (1 - historyWeight) + historicalRating * historyWeight);
      const finalDefense = round(peerDefense * (1 - historyWeight) + historicalRating * historyWeight);
      const overall = round((finalAttack + finalDefense) / 2);
      const winRate =
        history.matchesPlayed === 0 ? 0 : round((history.wins / history.matchesPlayed) * 100);

      return {
        id: player.id,
        name: player.name,
        peerAttack: round(peerAttack),
        peerDefense: round(peerDefense),
        votes,
        matchesPlayed: history.matchesPlayed,
        wins: history.wins,
        losses: history.losses,
        winRate,
        historicalRating,
        historyWeight: round(historyWeight),
        finalAttack,
        finalDefense,
        overall,
      };
    })
    .sort((left, right) => right.overall - left.overall || left.name.localeCompare(right.name));
}
