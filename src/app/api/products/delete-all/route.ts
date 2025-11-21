import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteQrAsset } from "@/lib/qr";

/**
 * Delete all products with proper cascade deletion
 * This is a destructive operation that requires admin authentication
 * 
 * Safety features:
 * - Admin authentication required
 * - Transaction-based deletion to ensure data consistency
 * - Cascade deletion: QRScanLog -> QrRecord -> Product
 * - QR asset cleanup from storage (R2 or local)
 * - Proper error handling
 */
export async function DELETE(request: Request) {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all products with their QR records and scan logs
    const allProducts = await prisma.product.findMany({
      include: {
        qrRecord: {
          include: {
            scanLogs: true,
          },
        },
      },
    });

    if (allProducts.length === 0) {
      return NextResponse.json(
        { success: true, message: "No products to delete", deletedCount: 0 },
        { status: 200 }
      );
    }

    // Delete all products in a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      let deletedCount = 0;
      let qrAssetsToDelete: Array<{ serialCode: string; qrImageUrl: string }> = [];

      // Collect QR assets to delete (outside transaction for async operations)
      for (const product of allProducts) {
        if (product.qrRecord) {
          qrAssetsToDelete.push({
            serialCode: product.qrRecord.serialCode,
            qrImageUrl: product.qrRecord.qrImageUrl,
          });
        }
      }

      // Delete all scan logs first (cascade order)
      const scanLogsCount = await tx.qRScanLog.deleteMany({});
      
      // Delete all QR records
      const qrRecordsCount = await tx.qrRecord.deleteMany({});
      
      // Delete all products
      const productsCount = await tx.product.deleteMany({});
      
      deletedCount = productsCount.count;

      return {
        deletedCount,
        scanLogsCount: scanLogsCount.count,
        qrRecordsCount: qrRecordsCount.count,
        qrAssetsToDelete,
      };
    });

    // Delete QR assets from storage (outside transaction)
    // This is done after transaction to avoid blocking database operations
    const deletePromises = result.qrAssetsToDelete.map((asset) =>
      deleteQrAsset(asset.serialCode, asset.qrImageUrl).catch((error) => {
        // Log error but don't fail the entire operation
        console.error(`Failed to delete QR asset for ${asset.serialCode}:`, error);
        return null;
      })
    );

    await Promise.allSettled(deletePromises);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} product(s)`,
      deletedCount: result.deletedCount,
      details: {
        products: result.deletedCount,
        qrRecords: result.qrRecordsCount,
        scanLogs: result.scanLogsCount,
      },
    });
  } catch (error: any) {
    console.error("Delete all products failed:", error);
    return NextResponse.json(
      {
        error: "Failed to delete all products",
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

