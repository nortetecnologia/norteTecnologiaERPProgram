"use client";

import { deleteUserAction } from "./actions";

export function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  async function handleDelete(formData: FormData) {
    if (!confirm(`Excluir o usuário ${email}?\n\nEsta ação não pode ser desfeita.`)) return;
    await deleteUserAction(formData);
  }

  return (
    <form action={handleDelete}>
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        className="px-3 py-1.5 border border-red-800/50 text-xs text-red-500 rounded-lg hover:border-red-500 hover:text-red-400 transition-colors"
      >
        Excluir
      </button>
    </form>
  );
}
