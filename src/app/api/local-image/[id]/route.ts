import { NextRequest, NextResponse } from "next/server";
import { readLocalImage, contentTypeFromExt } from "@/lib/offline-images";

// Serve imagens salvas localmente no modo offline (referência /api/local-image/<id>)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clean = id.replace(/\.[a-z0-9]+$/i, "");
  const img = readLocalImage(clean);
  if (!img) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(img.buffer), {
    headers: {
      "Content-Type": contentTypeFromExt(img.ext),
      "Cache-Control": "no-store",
    },
  });
}
