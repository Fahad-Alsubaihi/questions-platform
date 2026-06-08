import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, questions, auditLogs } from "@/lib/db";
import { eq } from "drizzle-orm";
import { questionSchema } from "@/lib/validations/question";
import { getErrorMessage } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { action, ...questionData } = body;

    if (action === "approve" || action === "reject") {
      const status = action === "approve" ? "approved" : "rejected";

      const [updated] = await db
        .update(questions)
        .set({ status, reviewedBy: session.user.id, updatedAt: new Date() })
        .where(eq(questions.id, id))
        .returning();

      await db.insert(auditLogs).values({
        action,
        questionId: id,
        userId: session.user.id,
        metadata: {},
      });

      return NextResponse.json({ data: updated });
    }

    if (action === "edit") {
      const parsed = questionSchema.partial().safeParse(questionData);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(questions)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(questions.id, id))
        .returning();

      await db.insert(auditLogs).values({
        action: "edit",
        questionId: id,
        userId: session.user.id,
        metadata: { changes: Object.keys(parsed.data) },
      });

      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await db.delete(questions).where(eq(questions.id, id));
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
