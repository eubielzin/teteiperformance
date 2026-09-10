// Cliente HTTP para a API FastAPI que roda no Raspberry Pi (leitura do sensor).
// Usado só pela tela "Meu treino" (sessão individual) — o dashboard PedalArena
// continua lendo o Supabase Realtime normalmente.

export type SessaoStatus = {
  usuario_id: string | null
  ativa: boolean
  rotacoes: number
  distancia_km: number
  velocidade_kmh: number
  tempo_segundos: number
}

const BIKE_API_URL = process.env.NEXT_PUBLIC_BIKE_API_URL

export function isBikeApiConfigured(): boolean {
  return Boolean(BIKE_API_URL)
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

export function iniciarSessao(usuarioId: string): Promise<SessaoStatus> {
  return request<SessaoStatus>('/sessao/iniciar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: usuarioId }),
  })
}

export function buscarStatus(): Promise<SessaoStatus> {
  return request<SessaoStatus>('/sessao/status')
}

export function finalizarSessao(): Promise<SessaoStatus> {
  return request<SessaoStatus>('/sessao/finalizar', { method: 'POST' })
}
