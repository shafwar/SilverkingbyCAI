import { JournalPostFormClient } from "../JournalPostFormClient";

export const dynamic = "force-dynamic";

export default function AdminJournalNewPage() {
  return <JournalPostFormClient mode="new" />;
}
