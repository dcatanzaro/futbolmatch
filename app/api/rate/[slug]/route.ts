import { NextResponse } from "next/server";
import { z } from "zod";

import { isValidPublicPassword } from "@/lib/auth";
import { createSubmission, getActivePlayers, getSessionBySlug } from "@/lib/db";

const answerSchema = z.object({
  playerId: z.number().int().positive(),
  attackScore: z.number().int().min(1).max(10),
  defenseScore: z.number().int().min(1).max(10),
});

const payloadSchema = z.object({
  password: z.string(),
  answers: z.array(answerSchema),
});

function getIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  return realIp?.trim() || null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!isValidPublicPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Password invalido." }, { status: 401 });
  }

  const session = getSessionBySlug(slug);
  if (!session) {
    return NextResponse.json({ error: "Sesion inexistente." }, { status: 404 });
  }

  if (session.status !== "open") {
    return NextResponse.json({ error: "La sesion no esta abierta." }, { status: 409 });
  }

  const players = getActivePlayers();
  const playerIds = new Set(players.map((player) => player.id));

  if (parsed.data.answers.length !== players.length) {
    return NextResponse.json(
      { error: "Tenes que puntuar a todos los jugadores activos." },
      { status: 400 },
    );
  }

  const uniquePlayerIds = new Set(parsed.data.answers.map((answer) => answer.playerId));
  if (uniquePlayerIds.size !== players.length) {
    return NextResponse.json(
      { error: "Hay jugadores repetidos o faltantes en la votacion." },
      { status: 400 },
    );
  }

  const hasUnknownPlayers = parsed.data.answers.some((answer) => !playerIds.has(answer.playerId));
  if (hasUnknownPlayers) {
    return NextResponse.json({ error: "Hay jugadores invalidos en el envio." }, { status: 400 });
  }

  createSubmission({
    sessionId: session.id,
    submittedIp: getIp(request),
    userAgent: request.headers.get("user-agent"),
    answers: parsed.data.answers,
  });

  return NextResponse.json({ ok: true });
}
