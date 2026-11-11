import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { extractRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCloudinaryCreds } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  // Auth + ERP role check
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!extractRole(user.app_metadata)) {
    return NextResponse.json({ error: "Acesso negado ao ERP." }, { status: 403 });
  }

  const creds = getCloudinaryCreds();
  if (!creds) {
    return NextResponse.json({ error: "Cloudinary não configurado." }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "erp";

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  // Validar tipo via magic bytes
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer).slice(0, 12);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45;
  const isGif = bytes[0] === 0x47 && bytes[1] === 0x49;
  if (!isJpeg && !isPng && !isWebp && !isGif) {
    return NextResponse.json({ error: "Tipo de arquivo não permitido." }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande (máx 10 MB)." }, { status: 400 });
  }

  // Gerar assinatura Cloudinary
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHmac("sha1", creds.apiSecret)
    .update(paramsToSign)
    .digest("hex");

  // Montar FormData para Cloudinary
  const cloudForm = new FormData();
  cloudForm.append("file", new Blob([buffer], { type: file.type }), file.name);
  cloudForm.append("api_key", creds.apiKey);
  cloudForm.append("timestamp", timestamp);
  cloudForm.append("signature", signature);
  cloudForm.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`,
    { method: "POST", body: cloudForm }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as any)?.error?.message ?? "Erro no upload." },
      { status: 500 }
    );
  }

  const data = await res.json();
  return NextResponse.json({ url: data.secure_url, public_id: data.public_id });
}
