// Server-only. Stores PKCE code_verifiers for cross-browser password reset.
// The Next.js server is a single Node.js process, so module state is safe.
const store = new Map<string, string>()

export const pkceStore = {
  set(id: string, verifier: string) {
    store.set(id, verifier)
    setTimeout(() => store.delete(id), 3_600_000) // expire after 1h
  },
  get(id: string): string | null {
    return store.get(id) ?? null
  },
  delete(id: string) {
    store.delete(id)
  },
}
