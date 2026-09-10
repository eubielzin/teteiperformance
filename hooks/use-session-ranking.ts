'use client'

import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { aggregateSessionsToRiders, type SessionRecord } from '@/types/session'
import type { Rider } from '@/lib/riders'

const TABLE = 'sessions'
const CHANNEL = 'sessions-history'

// Ranking histórico: agrega a tabela `sessions` (um treino = uma linha) por
// ciclista. Diferente do `bike_live_status` (que muda a cada 250-500ms),
// sessões só mudam quando alguém finaliza um treino — então um refetch
// completo a cada evento é simples e não pesa.
export function useSessionRanking() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.')
      setLoading(false)
      return
    }

    const { data, error: queryError } = await supabase.from(TABLE).select('*')
    if (queryError) {
      setError(queryError.message)
    } else {
      const sessions = (data as SessionRecord[]) ?? []
      setRiders(aggregateSessionsToRiders(sessions))
      setTotalSessions(sessions.length)
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    reload()

    if (!isSupabaseConfigured || !supabase) return

    const client = supabase
    const channel = client
      .channel(CHANNEL)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => {
        reload()
      })
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [reload])

  return { riders, totalSessions, loading, error }
}
