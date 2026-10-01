import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function QrPreviewPage2Redirect() {
  redirect("/admin/qr-preview");
}
