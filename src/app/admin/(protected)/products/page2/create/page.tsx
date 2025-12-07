import { GramProductCreatePageClient } from "../../gram/create/GramProductCreatePageClient";

// Alias route so that:
// - /admin/products/gram/create (lama) tetap bisa dipakai jika ada
// - /admin/products/page2/create (baru) sesuai naming yang kamu minta

export default function ProductsPage2Create() {
  return <GramProductCreatePageClient />;
}


