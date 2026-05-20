import { notFound } from "next/navigation";
import { JournalPostFormClient } from "../../JournalPostFormClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminJournalEditPage({ params }: Props) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (Number.isNaN(postId) || postId < 1) notFound();
  return <JournalPostFormClient mode="edit" postId={postId} />;
}
