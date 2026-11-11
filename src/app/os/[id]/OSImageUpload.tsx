"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { uploadOSImage } from "../uploadAction";
import { updateOSImages } from "./editActions";

export default function OSImageUpload({
  osId,
  initialImages,
}: {
  osId: string;
  initialImages: string[];
}) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadError(null);
    setSaved(false);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadOSImage(fd);
    setUploading(false);
    if (result.url) {
      const newImages = [...images, result.url];
      setImages(newImages);
      setSaving(true);
      const { error } = await updateOSImages(osId, newImages);
      setSaving(false);
      if (error) {
        setUploadError(error);
        setImages(images);
      } else {
        setSaved(true);
      }
    } else {
      setUploadError(result.error ?? "Erro no upload.");
    }
  }

  async function removeImage(idx: number) {
    setSaved(false);
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    setSaving(true);
    const { error } = await updateOSImages(osId, newImages);
    setSaving(false);
    if (error) {
      setUploadError(error);
      setImages(images);
    } else {
      setSaved(true);
    }
  }

  return (
    <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-gray-500">
          Imagens {images.length > 0 ? `(${images.length})` : ""}
        </div>
        {saving && <span className="text-xs text-gray-500">Salvando...</span>}
        {saved && !saving && <span className="text-xs text-green-400">Salvo</span>}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="relative group aspect-square rounded-lg overflow-hidden border border-brand-gray-mid hover:border-brand-yellow/50 transition-colors"
            >
              <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                <Image
                  src={url}
                  alt={`Imagem ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 200px"
                />
              </a>
              <button
                type="button"
                onClick={() => removeImage(idx)}
                disabled={saving}
                className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                aria-label="Remover imagem"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-400 mb-3">{uploadError}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={uploading || saving}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-sm text-brand-yellow hover:text-yellow-400 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 010 20" />
              </svg>
              Enviando...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Adicionar imagem
            </>
          )}
        </button>
        <span className="text-xs text-gray-600">JPG, PNG, WebP — máx. 10MB</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
    </div>
  );
}
