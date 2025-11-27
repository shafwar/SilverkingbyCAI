import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";
import { notFound } from "next/navigation";
import { ProductCreatePageClient } from "./ProductCreatePageClient";

// Force dynamic rendering - this page requires database access and authentication
export const dynamic = "force-dynamic";

type Props = {
  searchParams: { id?: string };
};

export default async function ProductCreatePage({ searchParams }: Props) {
  const id = searchParams.id ? Number(searchParams.id) : null;

  let product: Awaited<ReturnType<typeof prisma.product.findUnique>> | null = null;

  if (id) {
    product = await prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      notFound();
    }
  }

  return (
    <ProductCreatePageClient
      product={
        product
          ? {
              id: product.id,
              name: product.name,
              weight: product.weight,
              serialCode: product.serialCode,
              price: product.price ?? undefined,
              stock: product.stock ?? undefined,
            }
          : undefined
      }
    />
  );
}


