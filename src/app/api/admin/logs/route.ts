import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const query = searchParams.get("q");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {};

  if (query) {
    where.OR = [
      { qrRecord: { serialCode: { contains: query, mode: "insensitive" } } },
      { qrRecord: { product: { name: { contains: query, mode: "insensitive" } } } },
      { ip: { contains: query } },
    ];
  }

  if (from || to) {
    where.scannedAt = {};
    if (from) {
      where.scannedAt.gte = new Date(from);
    }
    if (to) {
      where.scannedAt.lte = new Date(to);
    }
  }

  const skip = limit ? 0 : (page - 1) * pageSize;
  const take = limit ?? pageSize;

  const [logs, total] = await Promise.all([
    prisma.qRScanLog.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      include: { qrRecord: { include: { product: true } } },
      skip,
      take,
    }),
    limit ? Promise.resolve(take) : prisma.qRScanLog.count({ where }),
  ]);

  const formatted = logs.map((log) => ({
    id: log.id,
    serialCode: log.qrRecord.serialCode,
    productName: log.qrRecord.product?.name ?? "Unknown",
    scannedAt: log.scannedAt,
    ip: log.ip,
    userAgent: log.userAgent,
    location: log.location,
  }));

  return NextResponse.json({
    logs: formatted,
    meta: {
      page,
      pageSize: take,
      total,
      totalPages: limit ? 1 : Math.ceil(total / pageSize),
    },
  });
}


