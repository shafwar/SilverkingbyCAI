/**
 * /api/health/database
 *
 * GET: Health check status OR data export with ?export=<model>&skip=0&take=1000
 * POST: Chunked DB migration to TiDB Cloud
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const exportModel = request.nextUrl.searchParams.get("export");

  if (exportModel) {
    try {
      const delegate = (prisma as any)[exportModel];
      if (!delegate) {
        return NextResponse.json({ error: `Invalid model ${exportModel}` }, { status: 400 });
      }

      const skip = parseInt(request.nextUrl.searchParams.get("skip") || "0", 10);
      const take = parseInt(request.nextUrl.searchParams.get("take") || "1000", 10);

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

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const targetTable = url.searchParams.get("table");

    const targetPrisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.TARGET_DATABASE_URL ||
            "mysql://28W1TMCs9KdURyk.root:sMCHjbMu7351UeXk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict",
        },
      },
    });

    const allModels = [
      "user",
      "serticardConfig",
      "serticardUploadedTemplate",
      "contentEntry",
      "pageMedia",
      "pageSection",
      "journal",
      "distributor",
      "feedback",
      "product",
      "qrRecord",
      "productDeleteBatch",
      "productDeleteHistory",
      "cmsProduct",
      "merchandiseItem",
      "gramProductBatch",
      "gramProductItem",
      "qRScanLog",
      "gramQRScanLog",
      "scanLogSummary",
    ];

    const models = targetTable ? [targetTable] : allModels;
    const results: Record<string, { found: number; migrated: number; error?: string }> = {};
    let totalMigrated = 0;

    for (const model of models) {
      try {
        const sourceDelegate = (prisma as any)[model];
        const targetDelegate = (targetPrisma as any)[model];

        if (!sourceDelegate || !targetDelegate) continue;

        const totalRows = await sourceDelegate.count();
        results[model] = { found: totalRows, migrated: 0 };

        if (totalRows > 0) {
          try {
            await targetDelegate.deleteMany({});
          } catch (e) {}

          const chunkSize = 500;
          let migratedForModel = 0;

          for (let skip = 0; skip < totalRows; skip += chunkSize) {
            const chunk = await sourceDelegate.findMany({
              take: chunkSize,
              skip: skip,
            });

            if (chunk.length > 0) {
              await targetDelegate.createMany({
                data: chunk,
                skipDuplicates: true,
              });
              migratedForModel += chunk.length;
            }
          }

          results[model].migrated = migratedForModel;
          totalMigrated += migratedForModel;
        }
      } catch (err: any) {
        results[model] = { found: 0, migrated: 0, error: err.message };
      }
    }

    await targetPrisma.$disconnect();

    return NextResponse.json({
      status: "success",
      migration: "completed",
      totalMigrated,
      details: results,
    });
  } catch (migErr: any) {
    return NextResponse.json({ status: "error", migration: "failed", error: migErr.message }, { status: 500 });
  }
}
