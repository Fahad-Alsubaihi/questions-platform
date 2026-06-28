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

    if (provider === "gemini") {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      const { generateText } = await import("ai");
      const google = createGoogleGenerativeAI({ apiKey: key });
      await generateText({ model: google("gemini-2.0-flash"), prompt: "Say OK.", maxOutputTokens: 5 });
      return NextResponse.json({ data: { ok: true, provider: "gemini" } });
    }

    if (provider === "groq") {
      const { createGroq } = await import("@ai-sdk/groq");
      const { generateText } = await import("ai");
      const groq = createGroq({ apiKey: key });
      await generateText({ model: groq("qwen/qwen3-32b"), prompt: "Say OK.", maxOutputTokens: 5 });
      return NextResponse.json({ data: { ok: true, provider: "groq" } });
    }

    if (provider === "anthropic") {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      const { generateText } = await import("ai");
      const anthropic = createAnthropic({ apiKey: key });
      await generateText({ model: anthropic("claude-haiku-4-5-20251001"), prompt: "Say OK.", maxOutputTokens: 5 });
      return NextResponse.json({ data: { ok: true, provider: "anthropic" } });
    }

    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 400 }
    );
  }
}
