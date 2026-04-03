import { NextResponse } from "next/server";
import { z } from "zod";

import { isValidAdminPassword } from "@/lib/auth";
import { createSession } from "@/lib/db";
import { slugify } from "@/lib/utils";

const schema = z.object({
  password: z.string(),
  name: z.string().trim().min(1).max(120),
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

  const slug = slugify(parsed.data.name);
  if (!slug) {
    return NextResponse.json({ error: "No se pudo generar el slug." }, { status: 400 });
  }

  try {
    const session = createSession(parsed.data.name, slug);
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json(
      { error: "Ya existe una sesion con ese nombre o slug." },
      { status: 409 },
    );
  }
}
