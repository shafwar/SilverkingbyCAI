import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productUpdateSchema } from "@/lib/validators/product";
import { normalizeSerialCode } from "@/lib/serial";
import { deleteQrAsset, generateAndStoreQR } from "@/lib/qr";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = productUpdateSchema.safeParse({
    ...body,
    id: params.id,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  const existing = await prisma.product.findUnique({
    where: { id: payload.id },
    include: { qrRecord: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let newSerial = existing.serialCode;
  let qrImageUrl = existing.qrRecord?.qrImageUrl;

  if (payload.serialCode) {
    newSerial = normalizeSerialCode(payload.serialCode);
  }

  const serialChanged = newSerial !== existing.serialCode;

  if (serialChanged) {
    await deleteQrAsset(existing.serialCode, existing.qrRecord?.qrImageUrl);
    const verifyUrl = `${baseUrl.replace(/\/$/, "")}/verify/${newSerial}`;
    const qrResult = await generateAndStoreQR(newSerial, verifyUrl);
    qrImageUrl = qrResult.url;
  }

  const updatedProduct = await prisma.product.update({
    where: { id: existing.id },
    data: {
      name: payload.name ?? existing.name,
      weight: payload.weight ?? existing.weight,
      price: payload.price ?? existing.price,
      stock: payload.stock ?? existing.stock,
      serialCode: newSerial,
    },
    include: { qrRecord: true },
  });

  if (updatedProduct.qrRecord) {
    await prisma.qrRecord.update({
      where: { id: updatedProduct.qrRecord.id },
      data: {
        serialCode: newSerial,
        qrImageUrl: qrImageUrl ?? updatedProduct.qrRecord.qrImageUrl,
      },
    });
  } else {
    await prisma.qrRecord.create({
      data: {
        productId: updatedProduct.id,
        serialCode: newSerial,
        qrImageUrl: qrImageUrl ?? "",
      },
    });
  }

  const refreshed = await prisma.product.findUnique({
    where: { id: updatedProduct.id },
    include: { qrRecord: true },
  });

  return NextResponse.json({ product: refreshed });
}

