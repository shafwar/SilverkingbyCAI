import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productCreateSchema } from "@/lib/validators/product";
import { generateSerialCode, normalizeSerialCode } from "@/lib/serial";
import { generateAndStoreQR } from "@/lib/qr";

const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

export async function POST(request: Request) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = productCreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  const serialCode = normalizeSerialCode(
    payload.serialCode ?? generateSerialCode("SK")
  );

  const verifyUrl = `${appBaseUrl.replace(/\/$/, "")}/verify/${serialCode}`;

  try {
    const { url: qrImageUrl } = await generateAndStoreQR(serialCode, verifyUrl);

    const product = await prisma.product.create({
      data: {
        name: payload.name,
        weight: payload.weight,
        price: payload.price,
        stock: payload.stock,
        serialCode,
        qrRecord: {
          create: {
            serialCode,
            qrImageUrl,
          },
        },
      },
      include: {
        qrRecord: true,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Product creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

