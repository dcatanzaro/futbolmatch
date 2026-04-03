import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "futbolmatch.sqlite");

type SqlValue = string | number | null;

export type Player = {
  id: number;
  name: string;
  active: number;
  created_at: string;
};

export type RatingSession = {
  id: number;
  name: string;
  slug: string;
  status: "draft" | "open" | "closed";
  created_at: string;
  closed_at: string | null;
};

export type Match = {
  id: number;
  label: string;
  season: string | null;
  source: string | null;
  winner_side: "black" | "white" | "draw";
  created_at: string;
};

export type MatchPlayerRow = {
  match_id: number;
  label: string;
  season: string | null;
  source: string | null;
  winner_side: "black" | "white" | "draw";
  created_at: string;
  player_id: number;
  player_name: string;
  team_side: "black" | "white";
};

const db = new Database(dbPath, { timeout: 5000 });
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rating_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'open', 'closed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS rating_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES rating_sessions(id) ON DELETE CASCADE,
    submitted_ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rating_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL REFERENCES rating_submissions(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    attack_score INTEGER NOT NULL CHECK(attack_score BETWEEN 1 AND 10),
    defense_score INTEGER NOT NULL CHECK(defense_score BETWEEN 1 AND 10)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    season TEXT,
    source TEXT,
    winner_side TEXT NOT NULL CHECK(winner_side IN ('black', 'white', 'draw')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS match_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_side TEXT NOT NULL CHECK(team_side IN ('black', 'white'))
  );

  CREATE INDEX IF NOT EXISTS idx_submissions_session_id ON rating_submissions(session_id);
  CREATE INDEX IF NOT EXISTS idx_answers_submission_id ON rating_answers(submission_id);
  CREATE INDEX IF NOT EXISTS idx_answers_player_id ON rating_answers(player_id);
  CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);
  CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON match_players(player_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_source_label ON matches(source, label);
`);

function queryMany<T>(sql: string, params: SqlValue[] = []) {
  return db.prepare(sql).all(...params) as T[];
}

function queryOne<T>(sql: string, params: SqlValue[] = []) {
  return (db.prepare(sql).get(...params) as T | undefined) ?? null;
}

export function getPlayers() {
  return queryMany<Player>(
    `SELECT id, name, active, created_at FROM players ORDER BY active DESC, LOWER(name) ASC`,
  );
}

export function getActivePlayers() {
  return queryMany<Player>(
    `SELECT id, name, active, created_at FROM players WHERE active = 1 ORDER BY LOWER(name) ASC`,
  );
}

export function createPlayer(name: string) {
  const result = db.prepare(`INSERT INTO players (name) VALUES (?)`).run(name.trim());
  return getPlayerById(Number(result.lastInsertRowid));
}

export function createPlayerRecord(name: string, active: boolean) {
  db.prepare(`INSERT OR IGNORE INTO players (name, active) VALUES (?, ?)`).run(
    name.trim(),
    active ? 1 : 0,
  );

  return getPlayerByName(name.trim());
}

export function updatePlayerActive(id: number, active: boolean) {
  db.prepare(`UPDATE players SET active = ? WHERE id = ?`).run(active ? 1 : 0, id);
  return getPlayerById(id);
}

export function getPlayerById(id: number) {
  return queryOne<Player>(
    `SELECT id, name, active, created_at FROM players WHERE id = ?`,
    [id],
  );
}

export function getPlayerByName(name: string) {
  return queryOne<Player>(
    `SELECT id, name, active, created_at FROM players WHERE name = ?`,
    [name],
  );
}

export function getSessions() {
  return queryMany<RatingSession>(
    `SELECT id, name, slug, status, created_at, closed_at FROM rating_sessions ORDER BY created_at DESC`,
  );
}

export function getLatestSessionWithSubmissions() {
  return queryOne<RatingSession>(
    `
      SELECT s.id, s.name, s.slug, s.status, s.created_at, s.closed_at
      FROM rating_sessions s
      INNER JOIN rating_submissions rs ON rs.session_id = s.id
      GROUP BY s.id, s.name, s.slug, s.status, s.created_at, s.closed_at
      ORDER BY s.created_at DESC, s.id DESC
      LIMIT 1
    `,
  );
}

export function getSessionBySlug(slug: string) {
  return queryOne<RatingSession>(
    `SELECT id, name, slug, status, created_at, closed_at FROM rating_sessions WHERE slug = ?`,
    [slug],
  );
}

export function createSession(name: string, slug: string) {
  const result = db
    .prepare(`INSERT INTO rating_sessions (name, slug, status) VALUES (?, ?, 'draft')`)
    .run(name.trim(), slug.trim());

  return getSessionById(Number(result.lastInsertRowid));
}

export function updateSessionStatus(id: number, status: RatingSession["status"]) {
  db.prepare(
    `UPDATE rating_sessions SET status = ?, closed_at = CASE WHEN ? = 'closed' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?`,
  ).run(status, status, id);

  return getSessionById(id);
}

export function getSessionById(id: number) {
  return queryOne<RatingSession>(
    `SELECT id, name, slug, status, created_at, closed_at FROM rating_sessions WHERE id = ?`,
    [id],
  );
}

export type SubmissionInput = {
  sessionId: number;
  submittedIp: string | null;
  userAgent: string | null;
  answers: Array<{
    playerId: number;
    attackScore: number;
    defenseScore: number;
  }>;
};

export function createSubmission(input: SubmissionInput) {
  const insertSubmission = db.prepare(
    `INSERT INTO rating_submissions (session_id, submitted_ip, user_agent) VALUES (?, ?, ?)`,
  );
  const insertAnswer = db.prepare(
    `INSERT INTO rating_answers (submission_id, player_id, attack_score, defense_score) VALUES (?, ?, ?, ?)`,
  );

  const transaction = db.transaction((payload: SubmissionInput) => {
    const submissionResult = insertSubmission.run(
      payload.sessionId,
      payload.submittedIp,
      payload.userAgent,
    );
    const submissionId = Number(submissionResult.lastInsertRowid);

    for (const answer of payload.answers) {
      insertAnswer.run(
        submissionId,
        answer.playerId,
        answer.attackScore,
        answer.defenseScore,
      );
    }

    return submissionId;
  });

  return transaction(input);
}

export type SessionSummary = {
  player_id: number;
  player_name: string;
  votes: number;
  avg_attack: number | null;
  avg_defense: number | null;
};

export function getSessionSummary(sessionId: number) {
  return queryMany<SessionSummary>(
    `
      SELECT
        p.id AS player_id,
        p.name AS player_name,
        COUNT(CASE WHEN s.id IS NOT NULL THEN a.id END) AS votes,
        ROUND(AVG(CASE WHEN s.id IS NOT NULL THEN a.attack_score END), 2) AS avg_attack,
        ROUND(AVG(CASE WHEN s.id IS NOT NULL THEN a.defense_score END), 2) AS avg_defense
      FROM players p
      LEFT JOIN rating_answers a ON a.player_id = p.id
      LEFT JOIN rating_submissions s ON s.id = a.submission_id AND s.session_id = ?
      WHERE p.active = 1
      GROUP BY p.id, p.name
      ORDER BY LOWER(p.name) ASC
    `,
    [sessionId],
  );
}

export type SubmissionAudit = {
  id: number;
  created_at: string;
  submitted_ip: string | null;
  user_agent: string | null;
  answers_count: number;
};

export function getSubmissionAudit(sessionId: number) {
  return queryMany<SubmissionAudit>(
    `
      SELECT
        s.id,
        s.created_at,
        s.submitted_ip,
        s.user_agent,
        COUNT(a.id) AS answers_count
      FROM rating_submissions s
      LEFT JOIN rating_answers a ON a.submission_id = s.id
      WHERE s.session_id = ?
      GROUP BY s.id, s.created_at, s.submitted_ip, s.user_agent
      ORDER BY s.created_at DESC
    `,
    [sessionId],
  );
}

export function deleteSubmission(id: number) {
  const result = db.prepare(`DELETE FROM rating_submissions WHERE id = ?`).run(id);
  return result.changes > 0;
}

export type DuplicateIp = {
  submitted_ip: string;
  submissions: number;
};

export function getDuplicateIps(sessionId: number) {
  return queryMany<DuplicateIp>(
    `
      SELECT submitted_ip, COUNT(*) AS submissions
      FROM rating_submissions
      WHERE session_id = ? AND submitted_ip IS NOT NULL AND submitted_ip != ''
      GROUP BY submitted_ip
      HAVING COUNT(*) > 1
      ORDER BY submissions DESC, submitted_ip ASC
    `,
    [sessionId],
  );
}

export type PeerRatingRow = {
  player_id: number;
  votes: number;
  avg_attack: number | null;
  avg_defense: number | null;
};

export function getPeerRatings(sessionId: number) {
  return queryMany<PeerRatingRow>(
    `
      SELECT
        p.id AS player_id,
        COUNT(a.id) AS votes,
        ROUND(AVG(a.attack_score), 2) AS avg_attack,
        ROUND(AVG(a.defense_score), 2) AS avg_defense
      FROM players p
      LEFT JOIN rating_submissions s ON s.session_id = ?
      LEFT JOIN rating_answers a ON a.submission_id = s.id AND a.player_id = p.id
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY LOWER(p.name) ASC
    `,
    [sessionId],
  );
}

export function getMatchCount() {
  const row = queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM matches`);
  return row?.total ?? 0;
}

export function getMatchesBySource(source: string) {
  return queryMany<Match>(
    `SELECT id, label, season, source, winner_side, created_at FROM matches WHERE source = ? ORDER BY id ASC`,
    [source],
  );
}

export type MatchInput = {
  label: string;
  season?: string | null;
  source?: string | null;
  winnerSide: Match["winner_side"];
  blackPlayerIds: number[];
  whitePlayerIds: number[];
};

export function createMatch(input: MatchInput) {
  const insertMatch = db.prepare(
    `INSERT INTO matches (label, season, source, winner_side) VALUES (?, ?, ?, ?)`,
  );
  const insertMatchPlayer = db.prepare(
    `INSERT INTO match_players (match_id, player_id, team_side) VALUES (?, ?, ?)`,
  );

  const transaction = db.transaction((payload: MatchInput) => {
    const result = insertMatch.run(
      payload.label,
      payload.season ?? null,
      payload.source ?? null,
      payload.winnerSide,
    );
    const matchId = Number(result.lastInsertRowid);

    for (const playerId of payload.blackPlayerIds) {
      insertMatchPlayer.run(matchId, playerId, "black");
    }

    for (const playerId of payload.whitePlayerIds) {
      insertMatchPlayer.run(matchId, playerId, "white");
    }

    return matchId;
  });

  return transaction(input);
}

export function getMatchesWithPlayers() {
  return queryMany<MatchPlayerRow>(
    `
      SELECT
        m.id AS match_id,
        m.label,
        m.season,
        m.source,
        m.winner_side,
        m.created_at,
        p.id AS player_id,
        p.name AS player_name,
        mp.team_side
      FROM matches m
      INNER JOIN match_players mp ON mp.match_id = m.id
      INNER JOIN players p ON p.id = mp.player_id
      ORDER BY m.id ASC, mp.team_side ASC, LOWER(p.name) ASC
    `,
  );
}

export default db;
