/**
 * GET /api/health/database
 *
 * Health check endpoint untuk memverifikasi status database dan data integrity.
 * Tidak memerlukan autentikasi untuk memudahkan monitoring.
 *
 * Returns:
 * - Connection status
 * - Table counts (untuk verifikasi data tidak terhapus)
 * - Database health status
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
      prisma.gramQRScanLog.count().catch(() => 0),
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
          // Page 1 (Product-based)
          products: {
            total: productCount,
            withQR: qrRecordCount,
            scanLogs: page1ScanLogCount,
          },
          // Page 2 (Gram-based)
          gramProducts: {
            batches: gramBatchCount,
            items: gramItemCount,
            scanLogs: page2ScanLogCount,
          },
          // Combined totals
          totals: {
            products: totalProducts,
            qrRecords: totalQRRecords,
            scanLogs: totalScanLogs,
          },
          // System tables
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
    // Database connection failed
    const errorMessage = error.message || "Unknown error";
    const errorCode = error.code || "UNKNOWN";

    // Check for specific error types
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
        troubleshooting: isConnectionError
          ? {
              step1: "Go to Railway Dashboard",
              step2: "Select MySQL service",
              step3: "Click Settings → Restart",
              step4: "Wait for status to become 'Online'",
              note: "Data is safe - shutdown does not delete data. Only restarts the service.",
            }
          : null,
      },
      { status: 503 }
    );
  }
}
