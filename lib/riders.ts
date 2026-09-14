export type Category = 'Sub-30' | '30-45' | '45+'

export type Rider = {
  id: string
  name: string
  phone?: string | null
  gym: string
  category: Category
  color: string
  km: number
  speed: number // km/h atual
  cadence: number // rpm
  active: boolean
}

export type RankedRider = Rider & {
  rank: number
  lap: number
  progress: number // 0..1 na volta atual
}

// Distância de uma volta na "pista virtual" (400m de velódromo)
export const LAP_KM = 0.4

export const PALETTE = [
  'oklch(0.86 0.2 130)',
  'oklch(0.82 0.15 80)',
  'oklch(0.7 0.15 200)',
  'oklch(0.7 0.16 320)',
  'oklch(0.65 0.2 25)',
  'oklch(0.8 0.13 160)',
  'oklch(0.75 0.15 40)',
  'oklch(0.72 0.14 260)',
]

// Cor determinística a partir de um id (ex.: bike_id vindo do Supabase),
// já que a cor é puramente visual e não existe na tabela do banco.
export function colorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

export function rank(riders: Rider[]): RankedRider[] {
  return [...riders]
    .sort((a, b) => b.km - a.km)
    .map((r, i) => {
      const lap = Math.floor(r.km / LAP_KM)
      const progress = (r.km % LAP_KM) / LAP_KM
      return { ...r, rank: i + 1, lap, progress }
    })
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
