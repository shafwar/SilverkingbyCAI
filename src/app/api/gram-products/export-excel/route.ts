import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * POST /api/gram-products/export-excel
 *
 * Export gram products to Excel/CSV format with all serial codes and root keys
 * Body: { batchIds?: number[] } - if empty, export all batches
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { batchIds } = body;

    // Get all items with root keys
    const whereClause = batchIds && batchIds.length > 0 ? { batchId: { in: batchIds } } : {};

    const items = await prisma.gramProductItem.findMany({
      where: whereClause,
      include: {
        batch: {
          select: {
            id: true,
            name: true,
            weight: true,
            quantity: true,
          },
        },
      },
      orderBy: [{ batchId: "desc" }, { serialCode: "asc" }],
    });

    // Prepare data for Excel
    const excelData = items.map((item) => ({
      "Batch ID": item.batchId,
      "Product Name": item.batch.name,
      "Weight (gr)": item.batch.weight,
      UniqCode: item.uniqCode,
      "Serial Code": item.serialCode,
      "Root Key": item.rootKey || "N/A",
      "QR Image URL": item.qrImageUrl,
      "Created At": item.createdAt.toISOString(),
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 10 }, // Batch ID
      { wch: 25 }, // Product Name
      { wch: 12 }, // Weight
      { wch: 18 }, // UniqCode
      { wch: 15 }, // Serial Code
      { wch: 10 }, // Root Key
      { wch: 50 }, // QR Image URL
      { wch: 25 }, // Created At
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Gram Products");

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="gram-products-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("[GramProductsExport] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
