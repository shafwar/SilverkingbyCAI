/**
 * GET /api/admin/serticard/preview?side=front|back
 * Proxy custom template image for preview (avoids CORS, no need for NEXT_PUBLIC_R2_PUBLIC_URL)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSerticardConfig } from "@/lib/serticard-config";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});
const BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "silverking-assets";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const side = searchParams.get("side");
    if (side !== "front" && side !== "back") {
      return NextResponse.json({ error: "Invalid side: use front or back" }, { status: 400 });
    }
    const config = await getSerticardConfig();
    const key = side === "front" ? config.customFrontR2Key : config.customBackR2Key;
    if (!key) {
      return NextResponse.json({ error: "No custom template" }, { status: 404 });
    }
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const obj = await r2Client.send(command);
    const body = obj.Body;
    if (!body) return NextResponse.json({ error: "Empty object" }, { status: 404 });
    const buffer = Buffer.from(await body.transformToByteArray());
    const contentType = key.endsWith(".png") ? "image/png" : "image/jpeg";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (e) {
    console.error("[Serticard Preview]", e);
    return NextResponse.json({ error: "Failed to load preview" }, { status: 500 });
  }
}
