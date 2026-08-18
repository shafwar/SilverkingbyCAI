import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model");
  const skip = parseInt(searchParams.get("skip") || "0", 10);
  const take = parseInt(searchParams.get("take") || "1000", 10);

  if (!model) {
    return NextResponse.json({ error: "Missing model parameter" }, { status: 400 });
  }

  try {
    const delegate = (prisma as any)[model];
    if (!delegate) {
      return NextResponse.json({ error: `Invalid model ${model}` }, { status: 400 });
    }

    const total = await delegate.count();
    const rows = await delegate.findMany({
      skip,
      take,
    });

    return NextResponse.json({
      model,
      skip,
      take,
      total,
      count: rows.length,
      data: rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
