import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, apiKeys } from "@/lib/db";
import { eq } from "drizzle-orm";
import { encrypt, decrypt, maskKey } from "@/lib/crypto";
import { getErrorMessage } from "@/lib/utils";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if ((session.user as { role?: string }).role !== "admin") return null;
  return session;
}

// GET — list all providers with masked keys
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db.select().from(apiKeys);
    const masked = rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      label: r.label,
      model: r.model,
      maskedKey: maskKey(decrypt(r.encryptedKey)),
      isActive: r.isActive,
      updatedAt: r.updatedAt,
    }));
    return NextResponse.json({ data: masked });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// POST — save or update a provider key
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { provider, key, label, model } = await req.json();

    if (!provider || !key) {
      return NextResponse.json({ error: "provider and key are required" }, { status: 400 });
    }

    if (!["gemini", "groq", "tavily"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const encryptedKey = encrypt(key.trim());

    // Upsert: delete existing for this provider, insert new
    await db.delete(apiKeys).where(eq(apiKeys.provider, provider));
    const [saved] = await db
      .insert(apiKeys)
      .values({
        provider,
        encryptedKey,
        model: model ?? "",
        label: label ?? provider,
        isActive: false,
      })
      .returning();

    return NextResponse.json({
      data: {
        id: saved.id,
        provider: saved.provider,
        label: saved.label,
        maskedKey: maskKey(key.trim()),
        isActive: saved.isActive,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// PATCH — set active provider
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id, model } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Deactivate all AI providers only (not tavily)
    await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.provider, "gemini"));
    await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.provider, "groq"));
    // Activate selected and optionally update model
    const [updated] = await db
      .update(apiKeys)
      .set({ isActive: true, updatedAt: new Date(), ...(model !== undefined ? { model } : {}) })
      .where(eq(apiKeys.id, id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// DELETE — remove a provider key
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await req.json();
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
