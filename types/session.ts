import { colorForId, type Rider } from '@/lib/riders'

// Formato bruto da tabela `sessions` no Supabase (histórico de treinos).
export type SessionRecord = {
  id: string
  usuario_id: string
  rider_name: string
  distance_km: number
  avg_speed_kmh: number
  duration_seconds: number
  rotations: number
  started_at: string | null
  ended_at: string
  created_at: string
}

// Agrega várias sessões (um treino = uma linha) em 1 rider por pessoa:
// km total somado (distância acumulada de todos os treinos), melhor
// velocidade já registrada, e cadência média ponderada pelo tempo pedalado.
export function aggregateSessionsToRiders(sessions: SessionRecord[]): Rider[] {
  type Acc = {
    name: string
    totalKm: number
    bestSpeed: number
    totalRotations: number
    totalMinutes: number
  }

  const byRider = new Map<string, Acc>()

  for (const s of sessions) {
    const key = s.usuario_id || s.rider_name
    if (!key) continue

    const acc = byRider.get(key) ?? {
      name: s.rider_name,
      totalKm: 0,
      bestSpeed: 0,
      totalRotations: 0,
      totalMinutes: 0,
    }

    acc.name = s.rider_name || acc.name
    acc.totalKm += Number(s.distance_km) || 0
    acc.bestSpeed = Math.max(acc.bestSpeed, Number(s.avg_speed_kmh) || 0)
    acc.totalRotations += Number(s.rotations) || 0
    acc.totalMinutes += (Number(s.duration_seconds) || 0) / 60

    byRider.set(key, acc)
  }

  return Array.from(byRider.entries()).map(([id, acc]) => ({
    id,
    name: acc.name,
    gym: '',
    category: 'Sub-30',
    color: colorForId(id),
    km: acc.totalKm,
    speed: acc.bestSpeed,
    cadence: acc.totalMinutes > 0 ? Math.round(acc.totalRotations / acc.totalMinutes) : 0,
    active: false,
  }))
}
