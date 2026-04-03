import { NextResponse } from "next/server";
import { z } from "zod";

import { isValidAdminPassword } from "@/lib/auth";
import { createPlayer } from "@/lib/db";

const schema = z.object({
  password: z.string(),
  name: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!isValidAdminPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Password invalido." }, { status: 401 });
  }

  try {
    const player = createPlayer(parsed.data.name);
    return NextResponse.json({ player });
  } catch {
    return NextResponse.json({ error: "No se pudo crear el jugador." }, { status: 409 });
  }
}
