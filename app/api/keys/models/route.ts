import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, apiKeys } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { getErrorMessage } from "@/lib/utils";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if ((session.user as { role?: string }).role !== "admin") return null;
  return session;
}

async function getModelsForProvider(provider: string, key: string) {
  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? "فشل جلب المودلات");
    }
    const data = await res.json();
    return (data.models as { name: string; displayName: string; supportedGenerationMethods?: string[] }[])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => ({ id: m.name.replace("models/", ""), name: m.displayName }));
  }

  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error("فشل جلب المودلات من Groq");
    const data = await res.json();
    return (data.data as { id: string }[])
      .filter((m) => !m.id.includes("whisper") && !m.id.includes("tts"))
      .map((m) => ({ id: m.id, name: m.id }));
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
    });
    if (!res.ok) throw new Error("فشل جلب المودلات من Anthropic");
    const data = await res.json();
    return (data.data as { id: string; display_name: string }[])
      .map((m) => ({ id: m.id, name: m.display_name || m.id }));
  }

  throw new Error("Invalid provider");
}

// GET — fetch models for a saved key by ID (decrypts server-side)
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: "Key not found" }, { status: 404 });

    const key = decrypt(row.encryptedKey);
    const models = await getModelsForProvider(row.provider, key);
    return NextResponse.json({ data: models });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 400 });
  }
}

// POST — fetch models using a raw key (before saving)
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { provider, key } = await req.json();
    if (!provider || !key) {
      return NextResponse.json({ error: "provider and key required" }, { status: 400 });
    }

    const models = await getModelsForProvider(provider, key);
    return NextResponse.json({ data: models });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
