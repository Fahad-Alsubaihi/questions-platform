import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getErrorMessage } from "@/lib/utils";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if ((session.user as { role?: string }).role !== "admin") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { provider, key } = await req.json();
    if (!provider || !key) {
      return NextResponse.json({ error: "provider and key required" }, { status: 400 });
    }

    if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ error: err?.error?.message ?? "فشل جلب المودلات" }, { status: 400 });
      }
      const data = await res.json();
      const models = (data.models as { name: string; displayName: string; supportedGenerationMethods?: string[] }[])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => ({
          id: m.name.replace("models/", ""),
          name: m.displayName,
        }));
      return NextResponse.json({ data: models });
    }

    if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        return NextResponse.json({ error: "فشل جلب المودلات من Groq" }, { status: 400 });
      }
      const data = await res.json();
      const models = (data.data as { id: string; owned_by?: string }[])
        .filter((m) => !m.id.includes("whisper") && !m.id.includes("tts"))
        .map((m) => ({ id: m.id, name: m.id }));
      return NextResponse.json({ data: models });
    }

    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
