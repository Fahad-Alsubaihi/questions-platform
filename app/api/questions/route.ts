import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, questions } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getErrorMessage } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as "pending" | "approved" | "rejected" | null;

    const query = db.select().from(questions).orderBy(desc(questions.createdAt));

    const rows = status
      ? await db.select().from(questions).where(eq(questions.status, status)).orderBy(desc(questions.createdAt))
      : await query;

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
