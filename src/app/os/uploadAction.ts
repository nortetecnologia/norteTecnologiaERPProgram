"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getCloudinaryCreds } from "@/lib/cloudinary";

export type UploadResult = { url?: string; error?: string };

async function isValidImageBytes(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
  // WebP (RIFF....WEBP)
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return true;
  return false;
}

export async function uploadOSImage(formData: FormData): Promise<UploadResult> {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return { error: "Não autorizado." };

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) return { error: "Arquivo inválido." };
  if (!file.type.startsWith("image/")) return { error: "Apenas imagens são permitidas." };
  if (file.size > 10 * 1024 * 1024) return { error: "Imagem muito grande. Máximo 10MB." };
  if (!(await isValidImageBytes(file))) return { error: "Formato de imagem inválido." };

  const creds = getCloudinaryCreds();
  if (!creds) return { error: "Cloudinary não configurado." };
  const { cloudName, apiKey, apiSecret } = creds;

  const folder = "norte-tecnologia/erp-os";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const uploadForm = new FormData();
  uploadForm.append("file", file);
  uploadForm.append("api_key", apiKey);
  uploadForm.append("timestamp", timestamp);
  uploadForm.append("signature", signature);
  uploadForm.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: uploadForm,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: (err as { error?: { message?: string } })?.error?.message ?? "Falha no upload." };
  }

  const data = await res.json() as { secure_url: string };
  return { url: data.secure_url };
}
