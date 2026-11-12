import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const userDataPath = process.env.USER_DATA_PATH ?? "";

function imagesDir() {
  return path.join(userDataPath, "pending_images");
}

function indexFile() {
  return path.join(imagesDir(), "index.json");
}

function extFromType(type: string): string {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

export function contentTypeFromExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

type ImageMeta = { ext: string; folder: string };

function readIndex(): Record<string, ImageMeta> {
  try {
    return JSON.parse(fs.readFileSync(indexFile(), "utf-8"));
  } catch {
    return {};
  }
}

function writeIndex(map: Record<string, ImageMeta>) {
  const tmp = indexFile() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(map, null, 2), "utf-8");
  fs.renameSync(tmp, indexFile());
}

// Salva a imagem no userData e retorna uma URL servível localmente (/api/local-image/<id>)
export function saveLocalImage(buffer: ArrayBuffer, type: string, folder: string): { localUrl: string; id: string } {
  const id = randomUUID();
  const ext = extFromType(type);
  fs.mkdirSync(imagesDir(), { recursive: true });
  fs.writeFileSync(path.join(imagesDir(), `${id}.${ext}`), Buffer.from(buffer));
  const map = readIndex();
  map[id] = { ext, folder };
  writeIndex(map);
  return { localUrl: `/api/local-image/${id}`, id };
}

export function readLocalImage(id: string): { buffer: Buffer; ext: string; folder: string } | null {
  try {
    const meta = readIndex()[id];
    if (!meta) return null;
    const buffer = fs.readFileSync(path.join(imagesDir(), `${id}.${meta.ext}`));
    return { buffer, ext: meta.ext, folder: meta.folder };
  } catch {
    return null;
  }
}
