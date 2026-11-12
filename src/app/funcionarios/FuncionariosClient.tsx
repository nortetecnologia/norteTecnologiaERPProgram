"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFuncionario, updateFuncionario, deleteFuncionario, toggleFuncionarioAtivo,
  createCargo, updateCargo, deleteCargo,
} from "./actions";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface RoleData {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface EmployeeData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  roles: RoleData[];
}

interface Props {
  employees: EmployeeData[];
  roles: RoleData[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type EmpModal =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; employee: EmployeeData }
  | { kind: "delete"; id: string; name: string; error?: string };

type RoleModal =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; role: RoleData }
  | { kind: "delete"; id: string; name: string; error?: string };

type Tab = "employees" | "roles";

const inputCls =
  "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#ffd600] focus:ring-1 focus:ring-[#ffd600] transition-colors";
const labelCls = "block text-xs font-medium text-[#9ca3af] mb-1";

// ── Componente principal ─────────────────────────────────────────────────────

export function FuncionariosClient({ employees: initialEmployees, roles: initialRoles }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("employees");

  // Employees
  const [empModal, setEmpModal] = useState<EmpModal>({ kind: "none" });
  const [empSearch, setEmpSearch] = useState("");
  const [empFormError, setEmpFormError] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [empIsActive, setEmpIsActive] = useState(true);

  // Roles
  const [roleModal, setRoleModal] = useState<RoleModal>({ kind: "none" });
  const [roleSearch, setRoleSearch] = useState("");
  const [roleFormError, setRoleFormError] = useState<string | null>(null);
  const [roleIsActive, setRoleIsActive] = useState(true);

  // ── Employees helpers ──────────────────────────────────────────────────────

  function openCreateEmp() {
    setSelectedRoleIds([]);
    setEmpIsActive(true);
    setEmpFormError(null);
    setEmpModal({ kind: "create" });
  }

  function openEditEmp(emp: EmployeeData) {
    setSelectedRoleIds(emp.roles.map((r) => r.id));
    setEmpIsActive(emp.is_active);
    setEmpFormError(null);
    setEmpModal({ kind: "edit", employee: emp });
  }

  function toggleRoleId(id: string) {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  function runEmpAction(fn: () => Promise<{ error?: string }>) {
    setEmpFormError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) { setEmpFormError(result.error); return; }
      setEmpModal({ kind: "none" });
      router.refresh();
    });
  }

  function handleEmpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    selectedRoleIds.forEach((id) => fd.append("role_ids", id));
    if (empModal.kind === "create") runEmpAction(() => createFuncionario(fd));
    else if (empModal.kind === "edit") runEmpAction(() => updateFuncionario(empModal.employee.id, fd));
  }

  function handleToggleEmpActive(emp: EmployeeData) {
    startTransition(async () => {
      await toggleFuncionarioAtivo(emp.id, !emp.is_active);
      router.refresh();
    });
  }

  // ── Roles helpers ──────────────────────────────────────────────────────────

  function openCreateRole() {
    setRoleIsActive(true);
    setRoleFormError(null);
    setRoleModal({ kind: "create" });
  }

  function openEditRole(role: RoleData) {
    setRoleIsActive(role.is_active);
    setRoleFormError(null);
    setRoleModal({ kind: "edit", role });
  }

  function runRoleAction(fn: () => Promise<{ error?: string }>) {
    setRoleFormError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) { setRoleFormError(result.error); return; }
      setRoleModal({ kind: "none" });
      router.refresh();
    });
  }

  function handleRoleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (roleModal.kind === "create") runRoleAction(() => createCargo(fd));
    else if (roleModal.kind === "edit") runRoleAction(() => updateCargo(roleModal.role.id, fd));
  }

  // ── Filtros ────────────────────────────────────────────────────────────────

  const filteredEmployees = initialEmployees.filter((e) => {
    const q = empSearch.toLowerCase();
    return e.name.toLowerCase().includes(q) || (e.phone?.includes(q) ?? false);
  });

  const filteredRoles = initialRoles.filter((r) =>
    r.name.toLowerCase().includes(roleSearch.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white text-2xl font-semibold">Funcionários e Cargos</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          {initialEmployees.length} funcionário{initialEmployees.length !== 1 ? "s" : ""} · {initialRoles.length} cargo{initialRoles.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 border-b border-brand-gray-mid">
        {(["employees", "roles"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-brand-yellow text-brand-yellow"
                : "border-transparent text-[#6b7280] hover:text-white"
            }`}
          >
            {tab === "employees" ? "Funcionários" : "Cargos"}
          </button>
        ))}
      </div>

      {/* ── Tab Funcionários ───────────────────────────────────────────────── */}
      {activeTab === "employees" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="search"
                placeholder="Buscar funcionário..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="w-full bg-brand-gray-dark border border-brand-gray-mid rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-brand-yellow transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={openCreateEmp}
              className="inline-flex items-center gap-2 bg-brand-yellow text-brand-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-yellow-dark transition-colors flex-shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo Funcionário
            </button>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="bg-brand-gray-dark border border-dashed border-brand-gray-mid rounded-xl p-12 text-center">
              <div className="mx-auto w-14 h-14 bg-brand-gray-mid rounded-full flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              {empSearch ? (
                <p className="text-[#6b7280] text-sm">Nenhum resultado para &ldquo;{empSearch}&rdquo;</p>
              ) : (
                <>
                  <h2 className="text-white font-medium mb-1">Nenhum funcionário cadastrado</h2>
                  <p className="text-[#6b7280] text-sm">
                    Clique em{" "}
                    <button type="button" onClick={openCreateEmp} className="text-brand-yellow hover:underline">
                      Novo Funcionário
                    </button>{" "}
                    para começar.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
              <ul className="divide-y divide-brand-gray-mid">
                {filteredEmployees.map((emp) => (
                  <li key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-gray-mid/40 transition-colors">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-brand-gray-mid flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[#9ca3af] uppercase select-none">
                      {emp.name.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{emp.name}</span>
                        {emp.roles.length > 0 && emp.roles.map((r) => (
                          <span key={r.id} className="text-[10px] font-medium bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 px-1.5 py-0.5 rounded-full">
                            {r.name}
                          </span>
                        ))}
                      </div>
                      {emp.phone && <div className="text-xs text-[#6b7280] mt-0.5">{emp.phone}</div>}
                    </div>

                    {/* Status + Ações */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleEmpActive(emp)}
                        disabled={isPending}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          emp.is_active
                            ? "bg-green-900/30 text-green-400 border-green-800/40 hover:bg-green-900/50"
                            : "bg-brand-gray-mid text-[#6b7280] border-brand-gray-light hover:bg-brand-gray-light"
                        }`}
                      >
                        {emp.is_active ? "Ativo" : "Inativo"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditEmp(emp)}
                        className="p-1.5 text-[#6b7280] hover:text-brand-yellow transition-colors"
                        aria-label={`Editar ${emp.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmpModal({ kind: "delete", id: emp.id, name: emp.name })}
                        className="p-1.5 text-[#6b7280] hover:text-red-400 transition-colors"
                        aria-label={`Excluir ${emp.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ── Tab Cargos ────────────────────────────────────────────────────── */}
      {activeTab === "roles" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="search"
                placeholder="Buscar cargo..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="w-full bg-brand-gray-dark border border-brand-gray-mid rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-brand-yellow transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={openCreateRole}
              className="inline-flex items-center gap-2 bg-brand-yellow text-brand-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-yellow-dark transition-colors flex-shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo Cargo
            </button>
          </div>

          {filteredRoles.length === 0 ? (
            <div className="bg-brand-gray-dark border border-dashed border-brand-gray-mid rounded-xl p-12 text-center">
              <div className="mx-auto w-14 h-14 bg-brand-gray-mid rounded-full flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </div>
              {roleSearch ? (
                <p className="text-[#6b7280] text-sm">Nenhum resultado para &ldquo;{roleSearch}&rdquo;</p>
              ) : (
                <>
                  <h2 className="text-white font-medium mb-1">Nenhum cargo cadastrado</h2>
                  <p className="text-[#6b7280] text-sm">
                    Clique em{" "}
                    <button type="button" onClick={openCreateRole} className="text-brand-yellow hover:underline">
                      Novo Cargo
                    </button>{" "}
                    para começar.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
              <ul className="divide-y divide-brand-gray-mid">
                {filteredRoles.map((role) => {
                  const empCount = initialEmployees.filter((e) => e.roles.some((r) => r.id === role.id)).length;
                  return (
                    <li key={role.id} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-gray-mid/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-medium">{role.name}</span>
                          <span className="text-[10px] text-[#6b7280] bg-brand-gray-mid px-2 py-0.5 rounded-full">
                            {empCount} funcionário{empCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-xs text-[#6b7280] mt-0.5 truncate">{role.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          role.is_active
                            ? "bg-green-900/30 text-green-400 border-green-800/40"
                            : "bg-brand-gray-mid text-[#6b7280] border-brand-gray-light"
                        }`}>
                          {role.is_active ? "Ativo" : "Inativo"}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditRole(role)}
                          className="p-1.5 text-[#6b7280] hover:text-brand-yellow transition-colors"
                          aria-label={`Editar ${role.name}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoleModal({ kind: "delete", id: role.id, name: role.name })}
                          disabled={empCount > 0}
                          title={empCount > 0 ? "Remova os funcionários antes de excluir" : "Excluir"}
                          className="p-1.5 text-[#6b7280] hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Excluir ${role.name}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ══ Modal Funcionário Criar/Editar ═══════════════════════════════════ */}
      {(empModal.kind === "create" || empModal.kind === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-brand-gray-dark border border-brand-gray-mid rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray-mid">
              <h2 className="text-white font-semibold">
                {empModal.kind === "create" ? "Novo Funcionário" : "Editar Funcionário"}
              </h2>
              <button type="button" onClick={() => setEmpModal({ kind: "none" })}
                className="p-1 text-[#6b7280] hover:text-white transition-colors" aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleEmpSubmit} className="p-6 space-y-4">
              {empFormError && (
                <div className="rounded-lg bg-red-900/20 border border-red-800/40 px-4 py-3 text-sm text-red-400">{empFormError}</div>
              )}

              {/* Nome */}
              <div>
                <label htmlFor="emp-name" className={labelCls}>Nome <span className="text-red-400">*</span></label>
                <input id="emp-name" name="name" type="text" required autoFocus
                  defaultValue={empModal.kind === "edit" ? empModal.employee.name : ""}
                  placeholder="Nome completo"
                  className={inputCls} />
              </div>

              {/* Telefone + E-mail */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="emp-phone" className={labelCls}>Telefone</label>
                  <input id="emp-phone" name="phone" type="tel"
                    defaultValue={empModal.kind === "edit" ? (empModal.employee.phone ?? "") : ""}
                    placeholder="(99) 99999-9999"
                    className={inputCls} />
                </div>
                <div>
                  <label htmlFor="emp-email" className={labelCls}>E-mail</label>
                  <input id="emp-email" name="email" type="email"
                    defaultValue={empModal.kind === "edit" ? (empModal.employee.email ?? "") : ""}
                    placeholder="email@exemplo.com"
                    className={inputCls} />
                </div>
              </div>

              {/* Cargos */}
              <div>
                <span className={labelCls}>Cargos</span>
                {initialRoles.length === 0 ? (
                  <p className="text-xs text-[#6b7280]">
                    Nenhum cargo cadastrado.{" "}
                    <button type="button" onClick={() => { setEmpModal({ kind: "none" }); setActiveTab("roles"); openCreateRole(); }}
                      className="text-brand-yellow hover:underline">
                      Criar cargo
                    </button>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {initialRoles.filter((r) => r.is_active).map((role) => {
                      const selected = selectedRoleIds.includes(role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => toggleRoleId(role.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            selected
                              ? "border-brand-yellow bg-brand-yellow/10 text-brand-yellow"
                              : "border-brand-gray-mid bg-brand-black text-[#9ca3af] hover:border-brand-gray-light"
                          }`}
                        >
                          {selected && (
                            <svg className="inline mr-1.5" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          {role.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label htmlFor="emp-notes" className={labelCls}>Observações</label>
                <textarea id="emp-notes" name="notes" rows={2}
                  defaultValue={empModal.kind === "edit" ? (empModal.employee.notes ?? "") : ""}
                  placeholder="Notas internas..."
                  className={`${inputCls} resize-none`} />
              </div>

              {/* Status (só na edição) */}
              {empModal.kind === "edit" && (
                <div>
                  <span className={labelCls}>Status</span>
                  <input type="hidden" name="is_active" value={empIsActive ? "true" : "false"} />
                  <button type="button" role="switch" aria-checked={empIsActive}
                    onClick={() => setEmpIsActive((v) => !v)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      empIsActive ? "bg-green-900/30 text-green-400 border-green-800/40" : "bg-brand-gray-mid text-[#9ca3af] border-brand-gray-light"
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${empIsActive ? "bg-green-400" : "bg-[#4b5563]"}`} aria-hidden="true" />
                    {empIsActive ? "Ativo" : "Inativo"}
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-brand-gray-mid">
                <button type="button" onClick={() => setEmpModal({ kind: "none" })}
                  className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white border border-brand-gray-mid rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="bg-brand-yellow text-brand-black text-sm font-semibold px-5 py-2 rounded-lg hover:bg-brand-yellow-dark transition-colors disabled:opacity-60">
                  {isPending ? "Salvando…" : empModal.kind === "create" ? "Criar Funcionário" : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal Funcionário Excluir ════════════════════════════════════════ */}
      {empModal.kind === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-brand-gray-dark border border-brand-gray-mid rounded-xl shadow-2xl p-6">
            <h2 className="text-white font-semibold mb-2">Excluir funcionário</h2>
            <p className="text-[#9ca3af] text-sm mb-1">
              Tem certeza que deseja excluir{" "}
              <span className="text-white font-medium">&ldquo;{empModal.name}&rdquo;</span>?
            </p>
            <p className="text-[#6b7280] text-xs mb-5">Esta ação não pode ser desfeita.</p>
            {empModal.error && (
              <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800/40 px-4 py-3 text-sm text-red-400">{empModal.error}</div>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEmpModal({ kind: "none" })}
                className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white border border-brand-gray-mid rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="button" disabled={isPending}
                onClick={() => {
                  const id = empModal.id; const name = empModal.name;
                  startTransition(async () => {
                    const result = await deleteFuncionario(id);
                    if (result?.error) { setEmpModal({ kind: "delete", id, name, error: result.error }); return; }
                    setEmpModal({ kind: "none" }); router.refresh();
                  });
                }}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
                {isPending ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Cargo Criar/Editar ═════════════════════════════════════════ */}
      {(roleModal.kind === "create" || roleModal.kind === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-brand-gray-dark border border-brand-gray-mid rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray-mid">
              <h2 className="text-white font-semibold">
                {roleModal.kind === "create" ? "Novo Cargo" : "Editar Cargo"}
              </h2>
              <button type="button" onClick={() => setRoleModal({ kind: "none" })}
                className="p-1 text-[#6b7280] hover:text-white transition-colors" aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="p-6 space-y-4">
              {roleFormError && (
                <div className="rounded-lg bg-red-900/20 border border-red-800/40 px-4 py-3 text-sm text-red-400">{roleFormError}</div>
              )}

              <div>
                <label htmlFor="role-name" className={labelCls}>Nome do cargo <span className="text-red-400">*</span></label>
                <input id="role-name" name="name" type="text" required autoFocus
                  defaultValue={roleModal.kind === "edit" ? roleModal.role.name : ""}
                  placeholder="Ex: Técnico, Atendente, Gerente"
                  className={inputCls} />
              </div>

              <div>
                <label htmlFor="role-desc" className={labelCls}>Descrição</label>
                <textarea id="role-desc" name="description" rows={2}
                  defaultValue={roleModal.kind === "edit" ? (roleModal.role.description ?? "") : ""}
                  placeholder="Responsabilidades do cargo..."
                  className={`${inputCls} resize-none`} />
              </div>

              {roleModal.kind === "edit" && (
                <div>
                  <span className={labelCls}>Status</span>
                  <input type="hidden" name="is_active" value={roleIsActive ? "true" : "false"} />
                  <button type="button" role="switch" aria-checked={roleIsActive}
                    onClick={() => setRoleIsActive((v) => !v)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      roleIsActive ? "bg-green-900/30 text-green-400 border-green-800/40" : "bg-brand-gray-mid text-[#9ca3af] border-brand-gray-light"
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${roleIsActive ? "bg-green-400" : "bg-[#4b5563]"}`} aria-hidden="true" />
                    {roleIsActive ? "Ativo" : "Inativo"}
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-brand-gray-mid">
                <button type="button" onClick={() => setRoleModal({ kind: "none" })}
                  className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white border border-brand-gray-mid rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="bg-brand-yellow text-brand-black text-sm font-semibold px-5 py-2 rounded-lg hover:bg-brand-yellow-dark transition-colors disabled:opacity-60">
                  {isPending ? "Salvando…" : roleModal.kind === "create" ? "Criar Cargo" : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal Cargo Excluir ══════════════════════════════════════════════ */}
      {roleModal.kind === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-brand-gray-dark border border-brand-gray-mid rounded-xl shadow-2xl p-6">
            <h2 className="text-white font-semibold mb-2">Excluir cargo</h2>
            <p className="text-[#9ca3af] text-sm mb-1">
              Tem certeza que deseja excluir{" "}
              <span className="text-white font-medium">&ldquo;{roleModal.name}&rdquo;</span>?
            </p>
            <p className="text-[#6b7280] text-xs mb-5">Esta ação não pode ser desfeita.</p>
            {roleModal.error && (
              <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800/40 px-4 py-3 text-sm text-red-400">{roleModal.error}</div>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setRoleModal({ kind: "none" })}
                className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white border border-brand-gray-mid rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="button" disabled={isPending}
                onClick={() => {
                  const id = roleModal.id; const name = roleModal.name;
                  startTransition(async () => {
                    const result = await deleteCargo(id);
                    if (result?.error) { setRoleModal({ kind: "delete", id, name, error: result.error }); return; }
                    setRoleModal({ kind: "none" }); router.refresh();
                  });
                }}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
                {isPending ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
