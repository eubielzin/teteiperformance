import { colorForId, type Rider } from '@/lib/riders'

// Formato bruto da tabela `sessions` no Supabase (histórico de treinos).
export type SessionRecord = {
  id: string
  usuario_id: string
  rider_name: string
  phone: string | null
  distance_km: number
  avg_speed_kmh: number
  duration_seconds: number
  rotations: number
  started_at: string | null
  ended_at: string
  created_at: string
}

// Data de referência de uma sessão pra fins de ordenação (mais recente primeiro):
// preferimos o início do treino, caindo pro fim ou pro registro de criação.
function sessionTimestamp(s: SessionRecord): number {
  const value = s.started_at ?? s.ended_at ?? s.created_at
  const parsed = value ? Date.parse(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

// Chave de agrupamento por ciclista, usada tanto na agregação quanto no
// agrupamento bruto — precisa ser exatamente a mesma nos dois lugares pra
// bater o `Rider.id` com as sessões dele.
function riderKey(s: SessionRecord): string {
  return s.usuario_id || s.rider_name
}

// Agrega várias sessões (um treino = uma linha) em 1 rider por pessoa:
// km total somado (distância acumulada de todos os treinos), melhor
// velocidade já registrada, e cadência média ponderada pelo tempo pedalado.
export function aggregateSessionsToRiders(sessions: SessionRecord[]): Rider[] {
  type Acc = {
    name: string
    phone: string | null
    lastTimestamp: number
    totalKm: number
    bestSpeed: number
    totalRotations: number
    totalMinutes: number
  }

  const byRider = new Map<string, Acc>()

  for (const s of sessions) {
    const key = riderKey(s)
    if (!key) continue

    const acc = byRider.get(key) ?? {
      name: s.rider_name,
      phone: null,
      lastTimestamp: -Infinity,
      totalKm: 0,
      bestSpeed: 0,
      totalRotations: 0,
      totalMinutes: 0,
    }

    acc.totalKm += Number(s.distance_km) || 0
    acc.bestSpeed = Math.max(acc.bestSpeed, Number(s.avg_speed_kmh) || 0)
    acc.totalRotations += Number(s.rotations) || 0
    acc.totalMinutes += (Number(s.duration_seconds) || 0) / 60

    // Nome e telefone de contato vêm sempre da sessão mais recente.
    const timestamp = sessionTimestamp(s)
    if (timestamp >= acc.lastTimestamp) {
      acc.lastTimestamp = timestamp
      acc.name = s.rider_name || acc.name
      acc.phone = s.phone ?? acc.phone
    }

    byRider.set(key, acc)
  }

  return Array.from(byRider.entries()).map(([id, acc]) => ({
    id,
    name: acc.name,
    phone: acc.phone,
    gym: '',
    category: 'Sub-30',
    color: colorForId(id),
    km: acc.totalKm,
    speed: acc.bestSpeed,
    cadence: acc.totalMinutes > 0 ? Math.round(acc.totalRotations / acc.totalMinutes) : 0,
    active: false,
  }))
}

// Agrupa as sessões brutas por ciclista (mesma chave usada no agregado
// acima), da mais recente pra mais antiga — usado no detalhe do ciclista
// no dashboard (histórico de percursos + telefone pro PDF).
export function groupSessionsByRider(sessions: SessionRecord[]): Map<string, SessionRecord[]> {
  const byRider = new Map<string, SessionRecord[]>()

  for (const s of sessions) {
    const key = riderKey(s)
    if (!key) continue
    const list = byRider.get(key) ?? []
    list.push(s)
    byRider.set(key, list)
  }

  for (const list of byRider.values()) {
    list.sort((a, b) => sessionTimestamp(b) - sessionTimestamp(a))
  }

  return byRider
}
