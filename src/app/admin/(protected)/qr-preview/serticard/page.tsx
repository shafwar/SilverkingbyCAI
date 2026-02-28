import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Serticard page removed from QR Preview.
 * Redirect to Page 1 so old links and bookmarks still work.
 */
export default function SerticardRedirectPage() {
  redirect("/admin/qr-preview");
}
