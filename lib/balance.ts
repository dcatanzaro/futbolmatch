export type BalancedPlayer = {
  id: number;
  name: string;
  finalAttack: number;
  finalDefense: number;
  overall: number;
};

export type SuggestedTeams = {
  objective: number;
  attackDiff: number;
  defenseDiff: number;
  overallDiff: number;
  teamBlack: BalancedPlayer[];
  teamWhite: BalancedPlayer[];
};

function sumTeam(players: BalancedPlayer[], field: keyof BalancedPlayer) {
  return players.reduce((total, player) => total + Number(player[field]), 0);
}

function buildSuggestion(teamBlack: BalancedPlayer[], teamWhite: BalancedPlayer[]): SuggestedTeams {
  const attackDiff = Math.abs(sumTeam(teamBlack, "finalAttack") - sumTeam(teamWhite, "finalAttack"));
  const defenseDiff = Math.abs(
    sumTeam(teamBlack, "finalDefense") - sumTeam(teamWhite, "finalDefense"),
  );
  const overallDiff = Math.abs(sumTeam(teamBlack, "overall") - sumTeam(teamWhite, "overall"));
  const objective = attackDiff * 0.4 + defenseDiff * 0.4 + overallDiff * 0.2;

  return {
    objective: Number(objective.toFixed(3)),
    attackDiff: Number(attackDiff.toFixed(3)),
    defenseDiff: Number(defenseDiff.toFixed(3)),
    overallDiff: Number(overallDiff.toFixed(3)),
    teamBlack: [...teamBlack].sort((a, b) => a.name.localeCompare(b.name)),
    teamWhite: [...teamWhite].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function generateBalancedTeams(players: BalancedPlayer[], limit = 3) {
  if (players.length < 2) {
    return [];
  }

  const ordered = [...players].sort((a, b) => a.name.localeCompare(b.name));
  const targetBlackSize = Math.floor(players.length / 2);
  const results: SuggestedTeams[] = [];
  const firstPlayer = ordered[0];

  function visit(index: number, teamBlack: BalancedPlayer[], teamWhite: BalancedPlayer[]) {
    if (index === ordered.length) {
      if (teamBlack.length !== targetBlackSize) {
        return;
      }

      results.push(buildSuggestion(teamBlack, teamWhite));
      return;
    }

    const current = ordered[index];
    const maxWhiteSize = ordered.length - targetBlackSize;

    if (teamBlack.length < targetBlackSize) {
      visit(index + 1, [...teamBlack, current], teamWhite);
    }

    if (teamWhite.length < maxWhiteSize) {
      visit(index + 1, teamBlack, [...teamWhite, current]);
    }
  }

  visit(1, [firstPlayer], []);

  return results
    .sort((left, right) => left.objective - right.objective)
    .slice(0, limit);
}
