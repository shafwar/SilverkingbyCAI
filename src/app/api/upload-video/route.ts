import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { getR2Url } from "@/utils/r2-url";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("video") as File;
    const category = (formData.get("category") as string) || "products";

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid video format. Allowed: MP4, WebM, MOV" },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 100MB" },
        { status: 400 }
      );
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate safe filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, "-").toLowerCase();
    const safeFileName = `${timestamp}-${originalName}`;

    // Determine folder based on category
    const validCategories = ["products", "tutorials", "promotional"];
    const folder = validCategories.includes(category) ? category : "products";

    // Save file
    const filePath = path.join(
      process.cwd(),
      "public",
      "videos",
      folder,
      safeFileName
    );
    await writeFile(filePath, buffer);

    // Return success with video URL (converted to R2 URL)
    const videoUrl = getR2Url(`/videos/${folder}/${safeFileName}`);

    return NextResponse.json(
      {
        success: true,
        message: "Video uploaded successfully",
        data: {
          url: videoUrl,
          fileName: safeFileName,
          size: file.size,
          type: file.type,
          category: folder,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload video. Please try again." },
      { status: 500 }
    );
  }
}

// GET endpoint to list videos
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fs = require("fs");
    const videosPath = path.join(process.cwd(), "public", "videos");

    // Read all categories
    const categories = ["products", "tutorials", "promotional"];
    const videos: any = {};

    for (const category of categories) {
      const categoryPath = path.join(videosPath, category);
      if (fs.existsSync(categoryPath)) {
        const files = fs.readdirSync(categoryPath);
        videos[category] = files
          .filter((f: string) => f.match(/\.(mp4|webm|mov)$/i))
          .map((f: string) => ({
            name: f,
            url: getR2Url(`/videos/${category}/${f}`),
          }));
      } else {
        videos[category] = [];
      }
    }

    return NextResponse.json({ videos }, { status: 200 });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}

