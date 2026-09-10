import { colorForId, type Category, type Rider } from '@/lib/riders'

// Formato bruto da tabela `bike_live_status` no Supabase (Bike_GM).
// Ajuste aqui caso o schema real evolua — os componentes do front
// nunca devem conhecer essas colunas diretamente.
export type BikeLiveStatus = {
  id: string
  bike_id: string
  session_id: string | null
  user_id: string | null
  rider_name: string
  gym: string | null
  category: string | null
  speed: number
  cadence: number
  distance_km: number
  rotations: number
  points: number
  active: boolean
  updated_at: string
}

const VALID_CATEGORIES: readonly Category[] = ['Sub-30', '30-45', '45+']

function normalizeCategory(value: string | null | undefined): Category {
  return (VALID_CATEGORIES as readonly string[]).includes(value ?? '')
    ? (value as Category)
    : 'Sub-30'
}

// Identificador estável do rider no front: preferimos `bike_id` (a bike
// física é quem realmente "compete"), com fallback para o `id` da linha.
export function riderKey(row: { bike_id?: string | null; id?: string | null }): string {
  return row.bike_id || row.id || ''
}

// Mapeamento centralizado Supabase -> modelo do front.
// Nenhum componente deve conhecer os nomes de coluna do banco: tudo passa por aqui.
export function mapBikeLiveStatusToRider(row: BikeLiveStatus): Rider {
  const id = riderKey(row)
  return {
    id,
    name: row.rider_name,
    gym: row.gym ?? 'Sem academia',
    category: normalizeCategory(row.category),
    // `color` é puramente visual e não existe no banco: derivamos de forma
    // determinística a partir do id da bike, para manter a mesma cor entre updates.
    color: colorForId(id),
    km: Number(row.distance_km) || 0,
    speed: Number(row.speed) || 0,
    cadence: Number(row.cadence) || 0,
    active: Boolean(row.active),
  }
}
