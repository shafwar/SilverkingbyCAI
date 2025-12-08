import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const query = searchParams.get("q");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {};
  const gramWhere: any = {};

  if (query) {
    where.OR = [
      { qrRecord: { serialCode: { contains: query, mode: "insensitive" } } },
      { qrRecord: { product: { name: { contains: query, mode: "insensitive" } } } },
      { ip: { contains: query } },
    ];
    gramWhere.OR = [
      { qrItem: { uniqCode: { contains: query, mode: "insensitive" } } },
      { qrItem: { batch: { name: { contains: query, mode: "insensitive" } } } },
      { ip: { contains: query } },
    ];
  }

  if (from || to) {
    where.scannedAt = {};
    gramWhere.scannedAt = {};
    if (from) {
      where.scannedAt.gte = new Date(from);
      gramWhere.scannedAt.gte = new Date(from);
    }
    if (to) {
      where.scannedAt.lte = new Date(to);
      gramWhere.scannedAt.lte = new Date(to);
    }
  }

  const skip = limit ? 0 : (page - 1) * pageSize;
  const take = limit ?? pageSize;

  const [logs, total, gramLogs, gramTotal] = await Promise.all([
    prisma.qRScanLog.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      include: { qrRecord: { include: { product: true } } },
      skip,
      take,
    }),
    limit ? Promise.resolve(take) : prisma.qRScanLog.count({ where }),
    prisma.gramQRScanLog.findMany({
      where: gramWhere,
      orderBy: { scannedAt: "desc" },
      include: { qrItem: { include: { batch: true } } },
      skip,
      take,
    }),
    limit ? Promise.resolve(take) : prisma.gramQRScanLog.count({ where: gramWhere }),
  ]);

    // Format Page 1 logs
    const formattedPage1 = logs.map((log) => ({
      id: `page1-${log.id}`,
      serialCode: log.qrRecord.serialCode,
      productName: log.qrRecord.product?.name ?? "Unknown",
      scannedAt: log.scannedAt,
      ip: log.ip,
      userAgent: log.userAgent,
      location: log.location,
      source: "page1" as const,
    }));

    // Format Page 2 logs
    const formattedPage2 = gramLogs.map((log) => ({
      id: `page2-${log.id}`,
      serialCode: log.qrItem.uniqCode,
      productName: `${log.qrItem.batch.name} (Page 2)`,
      scannedAt: log.scannedAt,
      ip: log.ip,
      userAgent: log.userAgent,
      location: log.location,
      source: "page2" as const,
    }));

    // Combine and sort by scannedAt
    const allLogs = [...formattedPage1, ...formattedPage2]
      .sort((a, b) => b.scannedAt.getTime() - a.scannedAt.getTime())
      .slice(0, take);

    const combinedTotal = limit ? take : total + gramTotal;

    return NextResponse.json({
      logs: allLogs,
      meta: {
        page,
        pageSize: take,
        total: combinedTotal,
        totalPages: limit ? 1 : Math.ceil(combinedTotal / pageSize),
        page1Total: total,
        page2Total: gramTotal,
      },
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}


