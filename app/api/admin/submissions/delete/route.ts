import { NextResponse } from "next/server";
import { z } from "zod";

import { isValidAdminPassword } from "@/lib/auth";
import { deleteSubmission } from "@/lib/db";

const schema = z.object({
  password: z.string(),
  id: z.number().int().positive(),
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

  const deleted = deleteSubmission(parsed.data.id);

  if (!deleted) {
    return NextResponse.json({ error: "Submission inexistente." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
