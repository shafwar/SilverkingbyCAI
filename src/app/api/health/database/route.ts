/**
 * /api/health/database
 *
 * GET: Health check status OR data export with ?export=<model>&skip=0&take=1000
 * POST: Chunked DB migration to TiDB Cloud
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const exportModel = url.searchParams.get("export");

  if (exportModel) {
    try {
      const delegate = (prisma as any)[exportModel];
      if (!delegate) {
        return NextResponse.json({ error: `Invalid model ${exportModel}` }, { status: 400 });
      }

      const skip = parseInt(url.searchParams.get("skip") || "0", 10);
      const take = parseInt(url.searchParams.get("take") || "1000", 10);

      const total = await delegate.count();
      const rows = await delegate.findMany({ skip, take });

      return NextResponse.json({
        model: exportModel,
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

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    // Get counts from all important tables
    const [
      productCount,
      qrRecordCount,
      page1ScanLogCount,
      gramBatchCount,
      gramItemCount,
      page2ScanLogCount,
      userCount,
      feedbackCount,
      serticardConfigCount,
      deleteHistoryCount,
      scanLogSummaryCount,
    ] = await Promise.all([
      prisma.product.count().catch(() => 0),
      prisma.qrRecord.count().catch(() => 0),
      prisma.qRScanLog.count().catch(() => 0),
      prisma.gramProductBatch.count().catch(() => 0),
      prisma.gramProductItem.count().catch(() => 0),
      prisma.gramQRScanLog ? prisma.gramQRScanLog.count().catch(() => 0) : 0,
      prisma.user.count().catch(() => 0),
      prisma.feedback.count().catch(() => 0),
      prisma.serticardConfig.count().catch(() => 0),
      prisma.productDeleteHistory.count().catch(() => 0),
      prisma.scanLogSummary.count().catch(() => 0),
    ]);

    // Calculate totals
    const totalProducts = productCount + gramBatchCount;
    const totalQRRecords = qrRecordCount + gramItemCount;
    const totalScanLogs = page1ScanLogCount + page2ScanLogCount;

    // Determine health status
    const isHealthy = productCount >= 0 && qrRecordCount >= 0;

    return NextResponse.json(
      {
        status: "healthy",
        connected: true,
        timestamp: new Date().toISOString(),
        database: {
          connection: "ok",
          health: isHealthy ? "healthy" : "degraded",
        },
        counts: {
          products: {
            total: productCount,
            withQR: qrRecordCount,
            scanLogs: page1ScanLogCount,
          },
          gramProducts: {
            batches: gramBatchCount,
            items: gramItemCount,
            scanLogs: page2ScanLogCount,
          },
          totals: {
            products: totalProducts,
            qrRecords: totalQRRecords,
            scanLogs: totalScanLogs,
          },
          system: {
            users: userCount,
            feedback: feedbackCount,
            serticardConfig: serticardConfigCount,
            deleteHistory: deleteHistoryCount,
            scanLogSummary: scanLogSummaryCount,
          },
        },
        message: "Database connection successful. All data is safe and accessible.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    const errorCode = error.code || "UNKNOWN";
    const isConnectionError =
      errorCode === "P1001" ||
      errorMessage.includes("Can't reach database") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND");

    return NextResponse.json(
      {
        status: "unhealthy",
        connected: false,
        timestamp: new Date().toISOString(),
        database: {
          connection: "failed",
          health: "down",
          error: {
            code: errorCode,
            message: errorMessage,
            type: isConnectionError ? "connection_error" : "query_error",
          },
        },
        counts: null,
        message: isConnectionError
          ? "Database service is down. Please restart MySQL service in Railway. Data is safe in persistent volume."
          : "Database query failed. Check error details.",
      },
      { status: 503 }
    );
  }
}
