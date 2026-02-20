import { Suspense } from "react";
import { ContentPageClient } from "./ContentPageClient";

export const dynamic = "force-dynamic";

export default function AdminContentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white/50">Loading…</div>}>
      <ContentPageClient />
    </Suspense>
  );
}
