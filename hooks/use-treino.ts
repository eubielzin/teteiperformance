'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  buscarStatus,
  finalizarSessao,
  iniciarSessao,
  isBikeApiConfigured,
  type SessaoStatus,
} from '@/lib/bike-api'

const STORAGE_KEY = 'pedal-arena:rider-name'
const POLL_MS = 1000

export type TreinoPhase = 'idle' | 'starting' | 'active' | 'finishing' | 'finished'

// Não há login: o "id" do usuário pro FastAPI é derivado do próprio nome digitado.
function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (á -> a, ç -> c, etc.)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return slug || 'ciclista'
}

// Controla o ciclo de vida de uma sessão individual de treino:
// iniciar -> poll de status a cada 1s -> finalizar -> salvar histórico no Supabase.
export function useTreino() {
  const [riderName, setRiderName] = useState('')
  const [phase, setPhase] = useState<TreinoPhase>('idle')
  const [status, setStatus] = useState<SessaoStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startedAtRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) setRiderName(saved)
    } catch {
      // localStorage indisponível (modo privado, SSR etc.) — segue sem nome salvo.
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Garante que o polling nunca fica órfão se o componente desmontar.
  useEffect(() => stopPolling, [stopPolling])

  const startPolling = useCallback(() => {
    stopPolling()
    intervalRef.current = setInterval(async () => {
      try {
        const current = await buscarStatus()
        setStatus(current)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar status da bike.')
      }
    }, POLL_MS)
  }, [stopPolling])

  const iniciar = useCallback(async () => {
    if (!riderName.trim()) {
      setError('Digite seu nome antes de iniciar.')
      return
    }
    if (!isBikeApiConfigured()) {
      setError('NEXT_PUBLIC_BIKE_API_URL não configurada em .env.local.')
      return
    }

    setError(null)
    setPhase('starting')

    try {
      window.localStorage.setItem(STORAGE_KEY, riderName)
    } catch {
      // sem localStorage, sem problema — só não lembra o nome na próxima visita
    }

    try {
      const usuarioId = slugify(riderName)
      const initial = await iniciarSessao(usuarioId)
      startedAtRef.current = new Date().toISOString()
      setStatus(initial)
      setPhase('active')
      startPolling()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar sessão.')
      setPhase('idle')
    }
  }, [riderName, startPolling])

  const finalizar = useCallback(async () => {
    setPhase('finishing')
    stopPolling()

    try {
      const final = await finalizarSessao()
      setStatus(final)

      if (isSupabaseConfigured && supabase) {
        const { error: insertError } = await supabase.from('sessions').insert({
          usuario_id: slugify(riderName),
          rider_name: riderName,
          distance_km: final.distancia_km,
          avg_speed_kmh: final.velocidade_kmh,
          duration_seconds: final.tempo_segundos,
          rotations: final.rotacoes,
          started_at: startedAtRef.current,
        })
        if (insertError) {
          setError(`Treino finalizado, mas falhou ao salvar o histórico: ${insertError.message}`)
        }
      }

      setPhase('finished')
    } catch (err) {
      // A sessão pode continuar rodando no Raspberry mesmo se a chamada falhar,
      // então voltamos a acompanhar o status em vez de perder o treino em andamento.
      setError(err instanceof Error ? err.message : 'Erro ao finalizar sessão.')
      setPhase('active')
      startPolling()
    }
  }, [riderName, stopPolling, startPolling])

  const reiniciar = useCallback(() => {
    startedAtRef.current = null
    setPhase('idle')
    setStatus(null)
    setError(null)
  }, [])

  return { riderName, setRiderName, phase, status, error, iniciar, finalizar, reiniciar }
}
