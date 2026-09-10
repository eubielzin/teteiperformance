'use client'

import { useCallback, useEffect, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { mapBikeLiveStatusToRider, riderKey, type BikeLiveStatus } from '@/types/bike-live-status'
import type { Rider } from '@/lib/riders'

const TABLE = 'bike_live_status'
const CHANNEL = 'bike-live-status'

function ridersEqual(a: Rider, b: Rider) {
  return (
    a.name === b.name &&
    a.gym === b.gym &&
    a.category === b.category &&
    a.color === b.color &&
    a.km === b.km &&
    a.speed === b.speed &&
    a.cadence === b.cadence &&
    a.active === b.active
  )
}

// Fonte de dados dos ciclistas: consulta inicial em `bike_live_status` + Realtime.
export function useRiders() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Aplica um único registro (INSERT ou UPDATE) sem refazer a lista inteira
  // nem tocar nos riders que não mudaram.
  const upsertRider = useCallback((row: BikeLiveStatus) => {
    const key = riderKey(row)
    if (!key) return
    const mapped = mapBikeLiveStatusToRider(row)

    setRiders((prev) => {
      const idx = prev.findIndex((r) => r.id === key)
      if (idx === -1) return [...prev, mapped]
      if (ridersEqual(prev[idx], mapped)) return prev
      const next = prev.slice()
      next[idx] = mapped
      return next
    })
  }, [])

  const removeRider = useCallback((row: Partial<BikeLiveStatus>) => {
    const key = riderKey(row)
    if (!key) return
    setRiders((prev) => (prev.some((r) => r.id === key) ? prev.filter((r) => r.id !== key) : prev))
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setError(
        'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local.',
      )
      setLoading(false)
      return
    }

    // Referência local: garante ao TypeScript (e ao closure de cleanup)
    // que o cliente segue não-nulo durante todo o ciclo de vida do efeito.
    const client = supabase

    let isMounted = true
    setLoading(true)
    setError(null)

    // 1) Consulta inicial: carrega o estado atual dos ciclistas.
    client
      .from(TABLE)
      .select('*')
      .then(({ data, error: queryError }) => {
        if (!isMounted) return
        if (queryError) {
          setError(queryError.message)
        } else {
          setRiders(((data as BikeLiveStatus[]) ?? []).map(mapBikeLiveStatusToRider))
        }
        setLoading(false)
      })

    // 2) Realtime: escuta INSERT/UPDATE/DELETE e atualiza só o rider afetado.
    const channel = client
      .channel(CHANNEL)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE },
        (payload: RealtimePostgresChangesPayload<BikeLiveStatus>) => {
          if (payload.eventType === 'DELETE') {
            removeRider(payload.old as Partial<BikeLiveStatus>)
          } else {
            upsertRider(payload.new as BikeLiveStatus)
          }
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      client.removeChannel(channel)
    }
  }, [upsertRider, removeRider])

  return { riders, loading, error }
}
