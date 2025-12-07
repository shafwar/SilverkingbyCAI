import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { QrPreviewGridGram } from "@/components/admin/QrPreviewGridGram";

export const dynamic = "force-dynamic";

export default async function QrPreviewPage2() {
  const items = await prisma.gramProductItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      batch: true,
    },
  });

  return (
    <div className="h-[calc(100vh-8rem)] overflow-y-auto pr-2 scrollbar-admin space-y-4">
      {/* Page switcher */}
      <div className="flex items-center justify-end pt-2 pr-1 gap-2">
        <Link
          href="/admin/qr-preview"
          className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:border-white/60"
        >
          Page 1
        </Link>
        <Link
          href="/admin/qr-preview/page2"
          className="rounded-full border border-white px-3 py-1.5 text-xs text-black bg-white"
        >
          Page 2
        </Link>
      </div>

      <QrPreviewGridGram
        products={items.map((item) => ({
          id: item.id,
          name: item.batch.name,
          weight: item.batch.weight,
          uniqCode: item.uniqCode,
          qrImageUrl: item.qrImageUrl,
          weightGroup: item.batch.weightGroup,
        }))}
      />
    </div>
  );
}


