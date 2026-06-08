import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, agentConfigs } from "@/lib/db";
import { eq } from "drizzle-orm";
import { agentConfigSchema } from "@/lib/validations/question";
import { getErrorMessage } from "@/lib/utils";
import { buildOutputSchema, DEFAULT_FEW_SHOT_EXAMPLES } from "@/lib/ai/schema-builder";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if ((session.user as { role?: string }).role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const configs = await db.select().from(agentConfigs);
    return NextResponse.json({ data: configs });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = agentConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const domains = parsed.data.activeDomains ?? [];
    const outputSchema = buildOutputSchema(domains);

    const [config] = await db
      .insert(agentConfigs)
      .values({
        ...parsed.data,
        outputSchema,
        fewShotExamples: DEFAULT_FEW_SHOT_EXAMPLES,
      })
      .returning();

    return NextResponse.json({ data: config }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { id, fewShotExamples: fewShotRaw, ...data } = body;

    if (!id) return NextResponse.json({ error: "Missing config id" }, { status: 400 });

    const parsed = agentConfigSchema.partial().safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    // Rebuild outputSchema whenever activeDomains changes
    let outputSchema: Record<string, unknown> | undefined;
    if (parsed.data.activeDomains !== undefined) {
      outputSchema = buildOutputSchema(parsed.data.activeDomains);
    }

    const updatePayload: Record<string, unknown> = {
      ...parsed.data,
      updatedAt: new Date(),
    };
    if (outputSchema) updatePayload.outputSchema = outputSchema;
    if (fewShotRaw !== undefined) updatePayload.fewShotExamples = fewShotRaw;

    const [updated] = await db
      .update(agentConfigs)
      .set(updatePayload)
      .where(eq(agentConfigs.id, id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
