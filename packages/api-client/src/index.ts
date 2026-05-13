import type { ApiResponse } from '@grailbabe/types'

const API_BASE = process.env.NEXT_PUBLIC_API_SERVER_URL ?? 'http://localhost:3001'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new Error(`[api-server] ${res.status}`)
  return res.json() as Promise<T>
}

export const pokemonApi = {
  searchCards: (q: string, page = 1, pageSize = 20) =>
    apiFetch<ApiResponse<unknown>>(`/api/pokemon/cards?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`),
  getCard: (id: string) => apiFetch<ApiResponse<unknown>>(`/api/pokemon/cards/${id}`),
  getSets: () => apiFetch<ApiResponse<unknown>>('/api/pokemon/sets'),
}

export const scryfallApi = {
  searchCards: (q: string) => apiFetch<ApiResponse<unknown>>(`/api/scryfall/cards?q=${encodeURIComponent(q)}`),
  getSets: () => apiFetch<ApiResponse<unknown>>('/api/scryfall/sets'),
}

export const tcgApi = {
  searchCards: (q: string) => apiFetch<ApiResponse<unknown>>(`/api/tcgapi/cards?q=${encodeURIComponent(q)}`),
}

export const psaApi = {
  getCert: (certNumber: string) => apiFetch<ApiResponse<unknown>>(`/api/psa/cert/${certNumber}`),
}
