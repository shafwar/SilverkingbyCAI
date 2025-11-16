import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    include: {
      qrRecord: {
        include: {
          scanLogs: true,
        },
      },
    },
  });

  const rows = products.map((product) => ({
    Name: product.name,
    WeightGr: product.weight,
    SerialCode: product.serialCode,
    Price: product.price ?? "",
    Stock: product.stock ?? "",
    ScanCount: product.qrRecord?.scanCount ?? 0,
    LastScan: product.qrRecord?.lastScannedAt ?? "",
    QRImage: product.qrRecord?.qrImageUrl ?? "",
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="silver-king-products.xlsx"`,
    },
  });
}

