"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import {
  createProduto,
  updateProduto,
  deleteProduto,
  toggleProdutoAtivo,
} from "./actions";

export interface ProductData {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  internal_code: string | null;
  price: number;
  price_max: number | null;
  stock: number;
  category_id: string | null;
  subcategory_id: string | null;
  is_active: boolean;
  product_type: "product" | "service";
  primary_image_url: string | null;
  category_name: string | null;
  subcategory_name: string | null;
}

export interface CategoryOption {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; product: ProductData }
  | { kind: "delete"; id: string; name: string; error?: string };

interface Props {
  products: ProductData[];
  categories: CategoryOption[];
}

const inputCls =
  "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#ffd600] focus:ring-1 focus:ring-[#ffd600] transition-colors";

const labelCls = "block text-xs font-medium text-[#9ca3af] mb-1";

function PlaceholderIcon() {
  return (
    <div className="w-10 h-10 rounded bg-[#2a2a2a] flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  );
}

export function ProdutosClient({ products, categories }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSubcategoryId, setFormSubcategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formProductType, setFormProductType] = useState<"product" | "service">("product");
  const [formBarcode, setFormBarcode] = useState("");
  const [formInternalCode, setFormInternalCode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"product" | "card">("product");

  const subcategoryOptions =
    categories.find((c) => c.id === formCategoryId)?.subcategories ?? [];

  function openCreate() {
    setFormCategoryId("");
    setFormSubcategoryId("");
    setIsActive(true);
    setFormProductType("product");
    setFormBarcode("");
    setFormInternalCode("");
    setFormError(null);
    setImageUrl("");
    setUploadState("idle");
    setUploadError(null);
    setPreviewMode("product");
    setModal({ kind: "create" });
  }

  function openEdit(product: ProductData) {
    setFormCategoryId(product.category_id ?? "");
    setFormSubcategoryId(product.subcategory_id ?? "");
    setIsActive(product.is_active);
    setFormProductType(product.product_type ?? "product");
    setFormBarcode(product.barcode ?? "");
    setFormInternalCode(product.internal_code ?? "");
    setFormError(null);
    setImageUrl(product.primary_image_url ?? "");
    setUploadState("idle");
    setUploadError(null);
    setPreviewMode("product");
    setModal({ kind: "edit", product });
  }

  function runFormAction(fn: () => Promise<{ error?: string }>) {
    setFormError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setModal({ kind: "none" });
      router.refresh();
    });
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (modal.kind === "create") {
      runFormAction(() => createProduto(formData));
    } else if (modal.kind === "edit") {
      runFormAction(() => updateProduto(modal.product.id, formData));
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState("uploading");
    setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "erp/produtos");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadState("error");
        setUploadError(data.error ?? "Erro no upload.");
      } else {
        setUploadState("idle");
        setImageUrl(data.url);
      }
    } catch {
      setUploadState("error");
      setUploadError("Falha ao enviar a imagem.");
    }
    e.target.value = "";
  }

  function handleToggleActive(product: ProductData) {
    startTransition(async () => {
      await toggleProdutoAtivo(product.id, !product.is_active);
      router.refresh();
    });
  }

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.brand?.toLowerCase().includes(q) ?? false) ||
      (p.sku?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold">Produtos e Serviços</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {products.length} item{products.length !== 1 ? "s" : ""} cadastrado{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-brand-yellow text-brand-black text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-brand-yellow-dark transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Produto
        </button>
      </div>

      {/* Busca */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por nome, marca ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-gray-dark border border-brand-gray-mid rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-colors"
          />
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-brand-gray-dark border border-dashed border-brand-gray-mid rounded-xl p-12 text-center">
          <div className="mx-auto w-14 h-14 bg-brand-gray-mid rounded-full flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          {search ? (
            <>
              <h2 className="text-white font-medium mb-1">Nenhum resultado para &ldquo;{search}&rdquo;</h2>
              <p className="text-[#6b7280] text-sm">Tente outro termo de busca.</p>
            </>
          ) : (
            <>
              <h2 className="text-white font-medium mb-1">Nenhum produto cadastrado</h2>
              <p className="text-[#6b7280] text-sm max-w-xs mx-auto">
                Clique em{" "}
                <button type="button" onClick={openCreate} className="text-brand-yellow hover:underline">
                  Novo Produto
                </button>{" "}
                para começar.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
          <ul className="divide-y divide-brand-gray-mid">
            {filtered.map((product) => (
              <li key={product.id} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-gray-mid/40 transition-colors">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  {product.primary_image_url ? (
                    <div className="w-10 h-10 rounded overflow-hidden bg-brand-gray-mid">
                      <Image src={product.primary_image_url} alt={product.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                    </div>
                  ) : (
                    <PlaceholderIcon />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">{product.name}</span>
                    {product.product_type === "service" && (
                      <span className="text-[10px] font-semibold bg-blue-900/30 text-blue-400 border border-blue-800/40 px-1.5 py-0.5 rounded-full">
                        Serviço
                      </span>
                    )}
                    {product.sku && (
                      <span className="text-[10px] font-mono bg-brand-gray-mid text-[#9ca3af] px-1.5 py-0.5 rounded">
                        {product.sku}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#6b7280] flex-wrap">
                    {product.brand && <span>{product.brand}</span>}
                    {product.brand && product.category_name && <span>·</span>}
                    {product.category_name && (
                      <span>
                        {product.category_name}
                        {product.subcategory_name ? ` › ${product.subcategory_name}` : ""}
                      </span>
                    )}
                    {product.internal_code && (
                      <span className="font-mono text-[#4b5563]">#{product.internal_code}</span>
                    )}
                  </div>
                </div>

                {/* Price + Stock */}
                <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-sm">
                  <span className="text-brand-yellow font-medium tabular-nums">{formatCurrency(product.price)}</span>
                  <span className={`tabular-nums ${product.stock === 0 ? "text-red-400" : "text-[#9ca3af]"}`}>
                    {product.stock} un.
                  </span>
                </div>

                {/* Status + Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(product)}
                    disabled={isPending}
                    title={product.is_active ? "Desativar" : "Ativar"}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      product.is_active
                        ? "bg-green-900/30 text-green-400 border-green-800/40 hover:bg-green-900/50"
                        : "bg-brand-gray-mid text-[#6b7280] border-brand-gray-light hover:bg-brand-gray-light"
                    }`}
                  >
                    {product.is_active ? "Ativo" : "Inativo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="p-1.5 text-[#6b7280] hover:text-brand-yellow transition-colors"
                    title="Editar"
                    aria-label={`Editar ${product.name}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: "delete", id: product.id, name: product.name })}
                    className="p-1.5 text-[#6b7280] hover:text-red-400 transition-colors"
                    title="Excluir"
                    aria-label={`Excluir ${product.name}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Modal criar / editar ─────────────────────────────── */}
      {(modal.kind === "create" || modal.kind === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            key={modal.kind === "edit" ? modal.product.id : "new"}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-brand-gray-dark border border-brand-gray-mid rounded-xl shadow-2xl"
          >
            {/* Header do modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray-mid">
              <h2 className="text-white font-semibold">
                {modal.kind === "create" ? "Novo Produto" : "Editar Produto"}
              </h2>
              <button
                type="button"
                onClick={() => setModal({ kind: "none" })}
                className="p-1 text-[#6b7280] hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="rounded-lg bg-red-900/20 border border-red-800/40 px-4 py-3 text-sm text-red-400">
                  {formError}
                </div>
              )}

              {/* Tipo */}
              <div>
                <span className={labelCls}>Tipo</span>
                <input type="hidden" name="product_type" value={formProductType} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormProductType("product")}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      formProductType === "product"
                        ? "border-brand-yellow bg-brand-yellow/10 text-brand-yellow"
                        : "border-brand-gray-mid bg-brand-black text-[#9ca3af] hover:border-brand-gray-light"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                    Produto
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormProductType("service")}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      formProductType === "service"
                        ? "border-blue-500 bg-blue-900/20 text-blue-400"
                        : "border-brand-gray-mid bg-brand-black text-[#9ca3af] hover:border-brand-gray-light"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                    </svg>
                    Serviço
                  </button>
                </div>
              </div>

              {/* Nome + Marca + SKU */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="p-name" className={labelCls}>Nome <span className="text-red-400">*</span></label>
                  <input id="p-name" name="name" type="text" required autoFocus
                    defaultValue={modal.kind === "edit" ? modal.product.name : ""}
                    placeholder="Ex: Mouse Gamer RGB"
                    className={inputCls} />
                </div>
                <div>
                  <label htmlFor="p-brand" className={labelCls}>Marca</label>
                  <input id="p-brand" name="brand" type="text"
                    defaultValue={modal.kind === "edit" ? (modal.product.brand ?? "") : ""}
                    placeholder="Ex: Logitech"
                    className={inputCls} />
                </div>
                <div>
                  <label htmlFor="p-sku" className={labelCls}>SKU</label>
                  <input id="p-sku" name="sku" type="text"
                    defaultValue={modal.kind === "edit" ? (modal.product.sku ?? "") : ""}
                    placeholder="Ex: MG-001"
                    className={inputCls} />
                </div>
              </div>

              {/* Código de Barras + Código Interno */}
              <div className="grid gap-4 sm:grid-cols-2">
                {formProductType === "product" && (
                  <div>
                    <label htmlFor="p-barcode" className={labelCls}>
                      Código de Barras
                      <span className="ml-1.5 text-[10px] font-normal text-[#4b5563]">leitor compatível</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#4b5563]" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 5v14M7 5v14M11 5v14M15 5v10M19 5v10M15 17h4v2h-4z"/>
                        </svg>
                      </span>
                      <input id="p-barcode" name="barcode" type="text" inputMode="numeric" autoComplete="off"
                        value={formBarcode}
                        onChange={(e) => setFormBarcode(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                        placeholder="Ex: 7891234567890"
                        className={`${inputCls} pl-8`} />
                    </div>
                  </div>
                )}
                <div className={formProductType === "service" ? "sm:col-span-2" : ""}>
                  <label htmlFor="p-internal-code" className={labelCls}>Código Interno</label>
                  <input id="p-internal-code" name="internal_code" type="text" autoComplete="off"
                    value={formInternalCode}
                    onChange={(e) => setFormInternalCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    placeholder="Ex: SVC-001"
                    className={inputCls} />
                </div>
              </div>

              {/* Preço + Estoque */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-price" className={labelCls}>
                    {formProductType === "service" ? "Preço mínimo (R$)" : "Preço (R$)"}{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <input id="p-price" name="price" type="number" required min="0" step="0.01"
                    defaultValue={modal.kind === "edit" ? modal.product.price : ""}
                    placeholder="0.00"
                    className={inputCls} />
                </div>
                {formProductType === "service" ? (
                  <div>
                    <label htmlFor="p-price-max" className={labelCls}>
                      Preço máximo (R$) <span className="text-[#6b7280]">(opcional)</span>
                    </label>
                    <input id="p-price-max" name="price_max" type="number" min="0" step="0.01"
                      defaultValue={modal.kind === "edit" ? (modal.product.price_max ?? "") : ""}
                      placeholder="0.00"
                      className={inputCls} />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="p-stock" className={labelCls}>Estoque <span className="text-red-400">*</span></label>
                    <input id="p-stock" name="stock" type="number" required min="0" step="1"
                      defaultValue={modal.kind === "edit" ? modal.product.stock : ""}
                      placeholder="0"
                      className={inputCls} />
                  </div>
                )}
              </div>
              {formProductType === "service" && (
                <div>
                  <label htmlFor="p-stock-svc" className={labelCls}>Estoque <span className="text-red-400">*</span></label>
                  <input id="p-stock-svc" name="stock" type="number" required min="0" step="1"
                    defaultValue={modal.kind === "edit" ? modal.product.stock : ""}
                    placeholder="0"
                    className={inputCls} />
                </div>
              )}

              {/* Categoria + Subcategoria */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-category" className={labelCls}>Categoria</label>
                  <select id="p-category" name="category_id" value={formCategoryId}
                    onChange={(e) => { setFormCategoryId(e.target.value); setFormSubcategoryId(""); }}
                    className={inputCls}>
                    <option value="">— Nenhuma —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-subcategory" className={labelCls}>Subcategoria</label>
                  <select id="p-subcategory" name="subcategory_id" value={formSubcategoryId}
                    onChange={(e) => setFormSubcategoryId(e.target.value)}
                    disabled={subcategoryOptions.length === 0}
                    className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <option value="">— Nenhuma —</option>
                    {subcategoryOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label htmlFor="p-description" className={labelCls}>Descrição</label>
                <textarea id="p-description" name="description" rows={3}
                  defaultValue={modal.kind === "edit" ? (modal.product.description ?? "") : ""}
                  placeholder="Descrição comercial do produto..."
                  className={`${inputCls} resize-none`} />
              </div>

              {/* Imagem Principal */}
              <div>
                <span className={labelCls}>Imagem Principal</span>
                <input type="hidden" name="image_url" value={imageUrl} />

                {/* Preview */}
                <div className="mb-3">
                  <div className="mb-2 flex items-center gap-1">
                    <button type="button" onClick={() => setPreviewMode("product")}
                      className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${previewMode === "product" ? "border-brand-yellow text-brand-yellow bg-brand-yellow/10" : "border-brand-gray-mid text-[#4b5563] hover:border-brand-gray-light"}`}>
                      Página do produto
                    </button>
                    <button type="button" onClick={() => setPreviewMode("card")}
                      className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${previewMode === "card" ? "border-brand-yellow text-brand-yellow bg-brand-yellow/10" : "border-brand-gray-mid text-[#4b5563] hover:border-brand-gray-light"}`}>
                      Card na vitrine
                    </button>
                  </div>

                  {previewMode === "product" ? (
                    <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-lg bg-brand-black border border-brand-gray-mid">
                      {imageUrl ? (
                        <>
                          <Image src={imageUrl} alt="Preview" fill className="object-contain" unoptimized />
                          <button type="button" onClick={() => { setImageUrl(""); setUploadError(null); }}
                            className="absolute right-2 top-2 rounded-md border border-brand-gray-light bg-brand-gray-dark/90 px-2 py-1 text-[11px] text-[#9ca3af] backdrop-blur-sm transition-colors hover:border-red-800/40 hover:text-red-400">
                            Remover
                          </button>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg className="h-12 w-12 text-brand-gray-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full max-w-[160px] rounded-lg border border-brand-gray-mid bg-brand-gray-dark overflow-hidden">
                      <div className="relative aspect-square bg-brand-black overflow-hidden">
                        {imageUrl ? (
                          <>
                            <Image src={imageUrl} alt="Preview card" fill className="object-cover" unoptimized />
                            <button type="button" onClick={() => { setImageUrl(""); setUploadError(null); }}
                              className="absolute right-1 top-1 rounded border border-brand-gray-light bg-brand-gray-dark/90 px-1.5 py-0.5 text-[10px] text-[#9ca3af] backdrop-blur-sm transition-colors hover:border-red-800/40 hover:text-red-400">
                              ×
                            </button>
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <svg className="h-10 w-10 text-brand-gray-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="mb-1.5 h-3 w-3/4 rounded bg-brand-gray-mid" aria-hidden="true" />
                        <div className="h-3 w-1/2 rounded bg-brand-gray-mid" aria-hidden="true" />
                        <div className="mt-1.5 h-3 w-1/3 rounded bg-brand-yellow/20" aria-hidden="true" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload arquivo */}
                <label className={`flex items-center gap-2 cursor-pointer w-full bg-brand-black border border-dashed border-brand-gray-light rounded-lg px-3 py-2.5 text-sm transition-colors hover:border-brand-yellow/50 ${uploadState === "uploading" ? "opacity-60 pointer-events-none" : ""}`}>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" disabled={uploadState === "uploading"} />
                  {uploadState === "uploading" ? (
                    <>
                      <svg className="animate-spin flex-shrink-0 text-brand-yellow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                        <path d="M12 3a9 9 0 019 9" />
                      </svg>
                      <span className="text-[#9ca3af]">Enviando…</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-[#9ca3af]" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span className="text-[#9ca3af]">{imageUrl ? "Substituir arquivo" : "Enviar imagem do PC"}</span>
                      <span className="ml-auto text-[11px] text-[#4b5563]">JPEG · PNG · WebP · máx. 10 MB</span>
                    </>
                  )}
                </label>

                {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}

                {/* URL manual */}
                <input type="url" placeholder="Ou cole a URL da imagem (Cloudinary, etc.)..."
                  value={imageUrl}
                  onChange={(e) => { setImageUrl(e.target.value); setUploadError(null); }}
                  className={`${inputCls} mt-2`} />
              </div>

              {/* Status (só na edição) */}
              {modal.kind === "edit" && (
                <div>
                  <span className={labelCls}>Status</span>
                  <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
                  <button type="button" role="switch" aria-checked={isActive} onClick={() => setIsActive((v) => !v)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      isActive ? "bg-green-900/30 text-green-400 border-green-800/40" : "bg-brand-gray-mid text-[#9ca3af] border-brand-gray-light"
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${isActive ? "bg-green-400" : "bg-[#4b5563]"}`} aria-hidden="true" />
                    {isActive ? "Ativo" : "Inativo"}
                  </button>
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-2 border-t border-brand-gray-mid">
                <button type="button" onClick={() => setModal({ kind: "none" })}
                  className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white border border-brand-gray-mid rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending || uploadState === "uploading"}
                  className="bg-brand-yellow text-brand-black text-sm font-semibold px-5 py-2 rounded-lg hover:bg-brand-yellow-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {isPending ? "Salvando…" : uploadState === "uploading" ? "Aguarde o upload…" : modal.kind === "create" ? "Criar Produto" : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal excluir ────────────────────────────────────── */}
      {modal.kind === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-brand-gray-dark border border-brand-gray-mid rounded-xl shadow-2xl p-6">
            <h2 className="text-white font-semibold mb-2">Excluir produto</h2>
            <p className="text-[#9ca3af] text-sm mb-1">
              Tem certeza que deseja excluir{" "}
              <span className="text-white font-medium">&ldquo;{modal.name}&rdquo;</span>?
            </p>
            <p className="text-[#6b7280] text-xs mb-5">Esta ação não pode ser desfeita.</p>
            {modal.error && (
              <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800/40 px-4 py-3 text-sm text-red-400">
                {modal.error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal({ kind: "none" })}
                className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white border border-brand-gray-mid rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="button" disabled={isPending}
                onClick={() => {
                  const id = modal.id;
                  const name = modal.name;
                  startTransition(async () => {
                    const result = await deleteProduto(id);
                    if (result?.error) {
                      setModal({ kind: "delete", id, name, error: result.error });
                      return;
                    }
                    setModal({ kind: "none" });
                    router.refresh();
                  });
                }}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {isPending ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
