import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const UPLOADS_DIR = "public/uploads";
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const pathSegments = (await params).path;
    if (!pathSegments?.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const relativePath = path.join(...pathSegments);
    if (relativePath.includes("..") || path.isAbsolute(relativePath)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const cwd = process.cwd();
    const filePath = path.join(cwd, UPLOADS_DIR, relativePath);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(relativePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
