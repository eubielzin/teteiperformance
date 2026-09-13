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
const STORAGE_KEY_PHONE = 'pedal-arena:rider-phone'
const POLL_MS = 1000
const COUNTDOWN_SECONDS = 40

export type TreinoPhase = 'idle' | 'countdown' | 'starting' | 'active' | 'finishing' | 'finished'

// Formata enquanto digita: (11) 99999-9999. Aceita colar com ou sem
// formatação — sempre normaliza a partir dos dígitos.
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)

  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${ddd}`
  if (rest.length <= 4) return `(${ddd}) ${rest}`
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}

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
  const [riderPhone, setRiderPhoneRaw] = useState('')
  const [phase, setPhase] = useState<TreinoPhase>('idle')
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [status, setStatus] = useState<SessaoStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startedAtRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const setRiderPhone = useCallback((value: string) => {
    setRiderPhoneRaw(formatPhone(value))
  }, [])

  useEffect(() => {
    try {
      const savedName = window.localStorage.getItem(STORAGE_KEY)
      if (savedName) setRiderName(savedName)
      const savedPhone = window.localStorage.getItem(STORAGE_KEY_PHONE)
      if (savedPhone) setRiderPhoneRaw(savedPhone)
    } catch {
      // localStorage indisponível (modo privado, SSR etc.) — segue sem dados salvos.
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  // Garante que o polling e a contagem regressiva nunca ficam órfãos se o
  // componente desmontar.
  useEffect(() => stopPolling, [stopPolling])
  useEffect(() => stopCountdown, [stopCountdown])

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

  // Chamada de fato à API do Raspberry — só acontece depois que a contagem
  // regressiva de preparação chega a zero.
  const conectarBike = useCallback(async () => {
    setPhase('starting')

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

  const iniciar = useCallback(() => {
    if (!riderName.trim()) {
      setError('Digite seu nome antes de iniciar.')
      return
    }
    if (riderPhone.replace(/\D/g, '').length < 10) {
      setError('Digite um número de celular válido (com DDD) antes de iniciar.')
      return
    }
    if (!isBikeApiConfigured()) {
      setError('NEXT_PUBLIC_BIKE_API_URL não configurada em .env.local.')
      return
    }

    setError(null)

    try {
      window.localStorage.setItem(STORAGE_KEY, riderName)
      window.localStorage.setItem(STORAGE_KEY_PHONE, riderPhone)
    } catch {
      // sem localStorage, sem problema — só não lembra os dados na próxima visita
    }

    // Contagem regressiva de preparação antes de conectar na bike de verdade.
    setPhase('countdown')
    setCountdown(COUNTDOWN_SECONDS)
    stopCountdown()
    countdownRef.current = setInterval(() => {
      setCountdown((seconds) => {
        if (seconds <= 1) {
          stopCountdown()
          conectarBike()
          return 0
        }
        return seconds - 1
      })
    }, 1000)
  }, [riderName, riderPhone, conectarBike, stopCountdown])

  const cancelarCountdown = useCallback(() => {
    stopCountdown()
    setPhase('idle')
    setCountdown(COUNTDOWN_SECONDS)
  }, [stopCountdown])

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
          phone: riderPhone || null,
          distance_km: final.distancia_km,
          avg_speed_kmh: final.velocidade_media_kmh,
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
  }, [riderName, riderPhone, stopPolling, startPolling])

  const reiniciar = useCallback(() => {
    startedAtRef.current = null
    stopCountdown()
    setCountdown(COUNTDOWN_SECONDS)
    setPhase('idle')
    setStatus(null)
    setError(null)
  }, [stopCountdown])

  return {
    riderName,
    setRiderName,
    riderPhone,
    setRiderPhone,
    phase,
    countdown,
    status,
    error,
    iniciar,
    cancelarCountdown,
    finalizar,
    reiniciar,
  }
}
