import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy URL: serticard CMS now lives at /admin/serticard (navbar “Serticard”).
 */
export default function SerticardRedirectPage() {
  redirect("/admin/serticard");
}
