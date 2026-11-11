"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer } from "./actions";
import type { Customer } from "@/types";

interface Props {
  customer?: Customer;
}

type State = { error?: string; success?: boolean } | null;

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

  return "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos.";
}

export default function CustomerForm({ customer }: Props) {
  const router = useRouter();
  const [clientError, setClientError] = useState<string | null>(null);

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const cpfCnpj = (form.elements.namedItem("cpf_cnpj") as HTMLInputElement)?.value ?? "";
    const err = validateCpfCnpj(cpfCnpj);
    if (err) {
      e.preventDefault();
      setClientError(err);
    } else {
      setClientError(null);
    }
  }

  const errorMsg = clientError ?? state?.error;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      <Field label="Nome *" name="name" defaultValue={customer?.name} required />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Telefone" name="phone" defaultValue={customer?.phone} placeholder="(95) 99999-9999" />
        <Field label="E-mail" name="email" type="email" defaultValue={customer?.email} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="CPF / CNPJ"
          name="cpf_cnpj"
          defaultValue={customer?.cpf_cnpj}
          placeholder="000.000.000-00 ou 00.000.000/0000-00"
          onChange={() => setClientError(null)}
        />
        <Field label="Cidade" name="city" defaultValue={customer?.city} />
      </div>
      <Field label="Endereço" name="address" defaultValue={customer?.address} />
      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Observações</label>
        <textarea
          name="notes"
          defaultValue={customer?.notes ?? ""}
          rows={3}
          className="w-full bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
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

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  onChange?: () => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        onChange={onChange}
        className="w-full bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow transition-colors"
      />
    </div>
  );
}
