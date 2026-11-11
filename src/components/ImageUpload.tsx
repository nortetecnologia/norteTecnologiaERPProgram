"use client";

import { useState, useRef } from "react";

interface ImageUploadProps {
  name?: string;
  currentUrl?: string | null;
  folder?: string;
  label?: string;
}

export default function ImageUpload({
  name = "image_url",
  currentUrl,
  folder = "erp/produtos",
  label = "Imagem",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>(currentUrl ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local imediato
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError(null);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro no upload.");
        setPreview(currentUrl ?? null);
        return;
      }

      setUploadedUrl(data.url);
    } catch {
      setError("Falha ao enviar a imagem.");
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setPreview(null);
    setUploadedUrl("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="text-xs text-gray-400 block mb-2">{label}</label>

      {/* Hidden field that carries the URL in the form */}
      <input type="hidden" name={name} value={uploadedUrl} />

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-xl border border-brand-gray-mid"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
              <span className="text-xs text-white">Enviando…</span>
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-700"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-brand-gray-mid rounded-xl cursor-pointer hover:border-brand-yellow/50 transition-colors">
          <span className="text-2xl text-gray-600">📷</span>
          <span className="text-xs text-gray-500 mt-1">Adicionar</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleChange}
            className="hidden"
          />
        </label>
      )}

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
