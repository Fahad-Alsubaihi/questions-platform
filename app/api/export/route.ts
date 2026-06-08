import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, questions } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getErrorMessage } from "@/lib/utils";
import * as schema from "@/lib/db/schema";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if ((session.user as { role?: string }).role !== "admin") return null;
  return session;
}

// GET — return count of unexported approved questions
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const all = await db
      .select({ id: questions.id, exportedAt: questions.exportedAt })
      .from(questions)
      .where(eq(questions.status, "approved"));

    const notExported = all.filter((q) => !q.exportedAt).length;
    return NextResponse.json({ data: { total: all.length, notExported } });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// POST — export approved questions to production DB
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const prodUrl = process.env.PRODUCTION_DB_URL;
  if (!prodUrl) {
    return NextResponse.json(
      { error: "PRODUCTION_DB_URL غير محدد في متغيرات البيئة" },
      { status: 500 }
    );
  }

  try {
    const { onlyNew } = await req.json().catch(() => ({ onlyNew: true }));

    // Get approved questions
    const toExport = await db
      .select()
      .from(questions)
      .where(
        onlyNew
          ? eq(questions.status, "approved")
          : eq(questions.status, "approved")
      );

    const filtered = onlyNew ? toExport.filter((q) => !q.exportedAt) : toExport;

    if (filtered.length === 0) {
      return NextResponse.json({ data: { exported: 0, message: "لا توجد أسئلة جديدة للتصدير" } });
    }

    // Connect to production DB
    const pool = new Pool({ connectionString: prodUrl });
    const prodDb = drizzle(pool, { schema });

    // Upsert into production DB (same schema)
    const values = filtered.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      hint: q.hint,
      explanation: q.explanation,
      sourceUrl: q.sourceUrl,
      domain: q.domain,
      subdomain: q.subdomain,
      difficulty: q.difficulty,
      status: "approved" as const,
      configId: q.configId,
      reviewedBy: q.reviewedBy,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    }));

    await prodDb
      .insert(schema.questions)
      .values(values)
      .onConflictDoUpdate({
        target: schema.questions.id,
        set: {
          question: schema.questions.question,
          type: schema.questions.type,
          options: schema.questions.options,
          correctAnswer: schema.questions.correctAnswer,
          hint: schema.questions.hint,
          explanation: schema.questions.explanation,
          sourceUrl: schema.questions.sourceUrl,
          domain: schema.questions.domain,
          subdomain: schema.questions.subdomain,
          difficulty: schema.questions.difficulty,
          updatedAt: schema.questions.updatedAt,
        },
      });

    await pool.end();

    // Mark as exported in source DB
    const exportedIds = filtered.map((q) => q.id);
    await db
      .update(questions)
      .set({ exportedAt: new Date() })
      .where(inArray(questions.id, exportedIds));

    return NextResponse.json({
      data: { exported: filtered.length, message: `تم تصدير ${filtered.length} سؤال بنجاح` },
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
