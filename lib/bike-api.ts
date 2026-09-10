// Cliente HTTP para a API FastAPI que roda no Raspberry Pi (leitura do sensor).
// Usado só pela tela "Meu treino" (sessão individual) — o dashboard PedalArena
// continua lendo o Supabase Realtime normalmente.

// Espelha o retorno de `obter_status()` no FastAPI (leitura_ima.py / GPIO).
export type SessaoStatus = {
  usuario_id: string | null
  ativa: boolean
  pulsos: number
  rotacoes: number
  distancia_metros: number
  distancia_km: number
  velocidade_atual_kmh: number
  velocidade_media_kmh: number
  rpm: number
  tempo_segundos: number
}

const BIKE_API_URL = process.env.NEXT_PUBLIC_BIKE_API_URL

export function isBikeApiConfigured(): boolean {
  return Boolean(BIKE_API_URL)
}

function safeNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// O FastAPI é uma fonte externa (fora do nosso controle) — normalizamos aqui,
// na borda, pra garantir que todo `SessaoStatus` que sai desse módulo tem
// campos numéricos válidos, mesmo se algum vier ausente/null na resposta.
function normalizeSessaoStatus(raw: Partial<SessaoStatus> | null | undefined): SessaoStatus {
  return {
    usuario_id: raw?.usuario_id ?? null,
    ativa: Boolean(raw?.ativa),
    pulsos: safeNumber(raw?.pulsos),
    rotacoes: safeNumber(raw?.rotacoes),
    distancia_metros: safeNumber(raw?.distancia_metros),
    distancia_km: safeNumber(raw?.distancia_km),
    velocidade_atual_kmh: safeNumber(raw?.velocidade_atual_kmh),
    velocidade_media_kmh: safeNumber(raw?.velocidade_media_kmh),
    rpm: safeNumber(raw?.rpm),
    tempo_segundos: safeNumber(raw?.tempo_segundos),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BIKE_API_URL) {
    throw new Error(
      'NEXT_PUBLIC_BIKE_API_URL não configurada. Defina em .env.local o IP do Raspberry (ex.: http://192.168.82.141:8000).',
    )
  }

  const response = await fetch(`${BIKE_API_URL}${path}`, init)
  if (!response.ok) {
    throw new Error(`Falha ao chamar ${path} (HTTP ${response.status}).`)
  }
  return response.json() as Promise<T>
}

export async function iniciarSessao(usuarioId: string): Promise<SessaoStatus> {
  const raw = await request<Partial<SessaoStatus>>('/sessao/iniciar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: usuarioId }),
  })
  return normalizeSessaoStatus(raw)
}

export async function buscarStatus(): Promise<SessaoStatus> {
  const raw = await request<Partial<SessaoStatus>>('/sessao/status')
  return normalizeSessaoStatus(raw)
}

export async function finalizarSessao(): Promise<SessaoStatus> {
  const raw = await request<Partial<SessaoStatus>>('/sessao/finalizar', { method: 'POST' })
  return normalizeSessaoStatus(raw)
}
