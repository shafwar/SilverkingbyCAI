import { prisma } from "@/lib/prisma";
import { GramProductEditPageClient } from "./GramProductEditPageClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { id?: string };
};

export default async function GramProductEditPage({ searchParams }: Props) {
  const id = searchParams.id ? Number(searchParams.id) : null;

  if (!id || Number.isNaN(id)) {
    return null;
  }

  const batch = await prisma.gramProductBatch.findUnique({
    where: { id },
  });

  if (!batch) {
    return null;
  }

  return (
    <GramProductEditPageClient
      batch={{
        id: batch.id,
        name: batch.name,
        weight: batch.weight,
        quantity: batch.quantity,
      }}
    />
  );
}


