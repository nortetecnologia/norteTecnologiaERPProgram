"use client";

import { useActionState, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer } from "./actions";
import type { Customer } from "@/types";

interface Props {
  customer?: Customer;
}

type State = { error?: string; success?: boolean } | null;
type CnpjStatus = "idle" | "loading" | "found" | "not_found" | "error";

function maskCpfCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function validateCpfCnpj(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 11) {
    if (/^(\d)\1+$/.test(digits)) return "CPF inválido.";
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(digits[9]) !== check) return "CPF inválido.";
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(digits[10]) !== check) return "CPF inválido.";
    return null;
  }

  if (digits.length === 14) {
    if (/^(\d)\1+$/.test(digits)) return "CNPJ inválido.";
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = w1.reduce((s, w, i) => s + parseInt(digits[i]) * w, 0);
    let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(digits[12]) !== check) return "CNPJ inválido.";
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = w2.reduce((s, w, i) => s + parseInt(digits[i]) * w, 0);
    check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(digits[13]) !== check) return "CNPJ inválido.";
    return null;
  }

  if (digits.length > 0 && digits.length < 11) return null; // still typing
  if (digits.length > 11 && digits.length < 14) return null; // still typing
  return null;
}

export default function CustomerForm({ customer }: Props) {
  const router = useRouter();

  const action = customer
    ? async (_: State, formData: FormData) => {
        const result = await updateCustomer(customer.id, formData);
        if (result.success) router.push(`/clientes/${customer.id}`);
        return result;
      }
    : async (_: State, formData: FormData) => {
        const result = await createCustomer(formData);
        if (result.success) router.push("/clientes");
        return result;
      };

  const [state, formAction, isPending] = useActionState(action, null);

  const [fields, setFields] = useState({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    cpf_cnpj: customer?.cpf_cnpj ? maskCpfCnpj(customer.cpf_cnpj) : "",
    city: customer?.city ?? "",
    address: customer?.address ?? "",
    notes: customer?.notes ?? "",
  });

  const [cpfCnpjError, setCpfCnpjError] = useState<string | null>(null);
  const [cnpjStatus, setCnpjStatus] = useState<CnpjStatus>("idle");
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const lastLookedUpCnpj = useRef<string>("");

  function setField(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  function handleCpfCnpjChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCpfCnpj(e.target.value);
    setFields((prev) => ({ ...prev, cpf_cnpj: masked }));

    const digits = masked.replace(/\D/g, "");

    if (digits.length === 11) {
      setCpfCnpjError(validateCpfCnpj(masked));
      setCnpjStatus("idle");
    } else if (digits.length === 14) {
      const err = validateCpfCnpj(masked);
      setCpfCnpjError(err);
      if (!err) lookupCnpj(digits);
    } else {
      setCpfCnpjError(null);
      if (cnpjStatus !== "idle") setCnpjStatus("idle");
    }
  }

  async function lookupCnpj(cnpj: string) {
    if (lastLookedUpCnpj.current === cnpj) return;
    lastLookedUpCnpj.current = cnpj;
    setCnpjStatus("loading");
    setCnpjError(null);

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.message) detail = body.message;
          else if (body?.errors?.[0]?.message) detail = body.errors[0].message;
        } catch { /* ignore */ }
        setCnpjError(detail);
        setCnpjStatus("not_found");
        return;
      }
      const data = await res.json();

      const name = (data.razao_social || data.nome_fantasia || "").trim();
      const email = (data.email || "").trim().toLowerCase();
      const rawPhone = (data.ddd_telefone_1 || data.ddd_telefone_2 || "").replace(/\D/g, "");
      const phone = rawPhone
        ? rawPhone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3")
        : "";
      const addressParts = [
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
      ].filter(Boolean);
      const address = addressParts.join(", ");
      const city = (data.municipio || "").trim();

      setFields((prev) => ({
        ...prev,
        name: name || prev.name,
        email: email || prev.email,
        phone: phone || prev.phone,
        address: address || prev.address,
        city: city || prev.city,
      }));
      setCnpjStatus("found");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      setCnpjError(msg);
      setCnpjStatus("error");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const digits = fields.cpf_cnpj.replace(/\D/g, "");
    if (digits && digits.length !== 11 && digits.length !== 14) {
      e.preventDefault();
      setCpfCnpjError("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos.");
      return;
    }
    const err = validateCpfCnpj(fields.cpf_cnpj);
    if (err) {
      e.preventDefault();
      setCpfCnpjError(err);
    }
  }

  const errorMsg = state?.error;

  const inputClass =
    "w-full bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow transition-colors";

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Nome *</label>
        <input
          name="name"
          required
          value={fields.name}
          onChange={setField("name")}
          className={inputClass}
          placeholder="Nome completo ou razão social"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Telefone</label>
          <input
            name="phone"
            type="tel"
            value={fields.phone}
            onChange={setField("phone")}
            className={inputClass}
            placeholder="(95) 99999-9999"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">E-mail</label>
          <input
            name="email"
            type="email"
            value={fields.email}
            onChange={setField("email")}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">CPF / CNPJ</label>
          <input
            name="cpf_cnpj"
            value={fields.cpf_cnpj}
            onChange={handleCpfCnpjChange}
            className={`${inputClass} ${cpfCnpjError ? "border-red-500/60 focus:border-red-500" : ""}`}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
          {cpfCnpjError && (
            <p className="text-xs text-red-400 mt-1">{cpfCnpjError}</p>
          )}
          {cnpjStatus === "loading" && (
            <p className="text-xs text-brand-yellow mt-1">Consultando Receita Federal...</p>
          )}
          {cnpjStatus === "found" && (
            <p className="text-xs text-green-400 mt-1">
              Dados preenchidos via Receita Federal.
            </p>
          )}
          {cnpjStatus === "not_found" && (
            <p className="text-xs text-orange-400 mt-1">
              CNPJ não encontrado.{cnpjError ? ` (${cnpjError})` : ""}
            </p>
          )}
          {cnpjStatus === "error" && (
            <p className="text-xs text-red-400 mt-1">
              Erro ao consultar Receita Federal.{cnpjError ? ` Detalhe: ${cnpjError}` : ""}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Cidade</label>
          <input
            name="city"
            value={fields.city}
            onChange={setField("city")}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Endereço</label>
        <input
          name="address"
          value={fields.address}
          onChange={setField("address")}
          className={inputClass}
          placeholder="Rua, número, bairro"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Observações</label>
        <textarea
          name="notes"
          value={fields.notes}
          onChange={setField("notes")}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || !!cpfCnpjError}
          className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-bold px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {isPending ? "Salvando..." : customer ? "Salvar alterações" : "Criar cliente"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 text-sm text-gray-400 hover:text-white border border-brand-gray-mid rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
