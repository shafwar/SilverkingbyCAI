import { QrPreviewLayout } from "@/components/admin/QrPreviewLayout";
import { ZipIssuesPageClient } from "@/components/admin/ZipIssuesPageClient";

export const dynamic = "force-dynamic";

export default function SerticardZipIssuesPage() {
  return (
    <QrPreviewLayout>
      <ZipIssuesPageClient />
    </QrPreviewLayout>
  );
}
