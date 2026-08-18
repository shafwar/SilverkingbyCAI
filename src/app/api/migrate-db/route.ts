import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";


// Target TiDB Prisma
const targetPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.TARGET_DATABASE_URL ||
        "mysql://28W1TMCs9KdURyk.root:sMCHjbMu7351UeXk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict",
    },
  },
});

// Source Railway MySQL Prisma (default database)
const sourcePrisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  // Simple protection with existing CRON_SECRET or default migration key
  if (
    secret !== process.env.CRON_SECRET &&
    secret !== "silverking-migrate-2026"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, { found: number; migrated: number; error?: string }> = {};

  const models: (keyof typeof sourcePrisma)[] = [
    "user" as any,
    "product" as any,
    "qrRecord" as any,
    "productDeleteBatch" as any,
    "productDeleteHistory" as any,
    "cmsProduct" as any,
    "merchandiseItem" as any,
    "gramProductBatch" as any,
    "gramProductItem" as any,
    "qRScanLog" as any,
    "gramQRScanLog" as any,
    "scanLogSummary" as any,
    "serticardConfig" as any,
    "serticardUploadedTemplate" as any,
    "feedback" as any,
    "distributor" as any,
    "contentEntry" as any,
    "pageMedia" as any,
    "pageSection" as any,
    "journal" as any,
    "qrZipDownloadJob" as any,
    "qrZipDownloadCache" as any,
    "serticardZipRenderIssue" as any,
    "qrZipBundleState" as any,
    "qrZipDownloadAudit" as any,
  ];

  let totalMigrated = 0;

  for (const model of models) {
    try {
      const sourceDelegate = (sourcePrisma as any)[model];
      const targetDelegate = (targetPrisma as any)[model];

      if (!sourceDelegate || !targetDelegate) {
        continue;
      }

      const rows = await sourceDelegate.findMany();
      results[model] = { found: rows.length, migrated: 0 };

      if (rows.length > 0) {
        // Clear target table first
        try {
          await targetDelegate.deleteMany({});
        } catch (e) {
          // ignore
        }

        // Insert in batches
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          await targetDelegate.createMany({
            data: batch,
            skipDuplicates: true,
          });
        }

        results[model].migrated = rows.length;
        totalMigrated += rows.length;
      }
    } catch (err: any) {
      results[model] = {
        found: 0,
        migrated: 0,
        error: err.message,
      };
    }
  }

  return NextResponse.json({
    success: true,
    totalMigrated,
    details: results,
  });
}
