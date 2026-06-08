import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateQuestions } from "@/lib/ai/agent";
import { agentGenerateSchema } from "@/lib/validations/question";
import { getErrorMessage } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = agentGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const savedQuestions = await generateQuestions({
      topic: parsed.data.topic,
      count: parsed.data.count,
      difficulty: parsed.data.difficulty,
      domain: parsed.data.domain,
      sourceUrls: parsed.data.sourceUrls,
    });

    return NextResponse.json({ data: savedQuestions });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
