import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const targetPrisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.TARGET_DATABASE_URL ||
            "mysql://28W1TMCs9KdURyk.root:sMCHjbMu7351UeXk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict",
        },
      },
    });

    const results: Record<string, { found: number; migrated: number; error?: string }> = {};

    const models = [
      "user",
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
      "serticardConfig",
      "serticardUploadedTemplate",
      "feedback",
      "distributor",
      "contentEntry",
      "pageMedia",
      "pageSection",
      "journal",
      "qrZipDownloadJob",
      "qrZipDownloadCache",
      "serticardZipRenderIssue",
      "qrZipBundleState",
      "qrZipDownloadAudit",
    ];

    let totalMigrated = 0;

    for (const model of models) {
      try {
        const sourceDelegate = (prisma as any)[model];
        const targetDelegate = (targetPrisma as any)[model];

        if (!sourceDelegate || !targetDelegate) continue;

        const rows = await sourceDelegate.findMany();
        results[model] = { found: rows.length, migrated: 0 };

        if (rows.length > 0) {
          try {
            await targetDelegate.deleteMany({});
          } catch (e) {
            // ignore
          }

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
