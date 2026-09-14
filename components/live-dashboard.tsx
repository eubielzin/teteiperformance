'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bike, Trophy, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { rank, type Category, type RankedRider } from '@/lib/riders'
import { useSessionRanking } from '@/hooks/use-session-ranking'
import { StatsBar } from '@/components/stats-bar'
import { VirtualTrack } from '@/components/virtual-track'
import { Leaderboard } from '@/components/leaderboard'
import { Achievements } from '@/components/achievements'
import { RiderDetailModal } from '@/components/rider-detail-modal'

const FILTERS: { label: string; value: Category | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Sub-30', value: 'Sub-30' },
  { label: '30-45', value: '30-45' },
  { label: '45+', value: '45+' },
]

export function LiveDashboard() {
  const { riders, sessionsByRider, totalSessions, loading, error } = useSessionRanking()
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [selectedRider, setSelectedRider] = useState<RankedRider | null>(null)
  const [highlightedRiderId, setHighlightedRiderId] = useState<string | null>(null)

  const ranked = useMemo(() => {
    const base = filter === 'all' ? riders : riders.filter((r) => r.category === filter)
    return rank(base)
  }, [riders, filter])

  const allRanked = useMemo(() => rank(riders), [riders])

  const highlightedRider = useMemo(
    () => (highlightedRiderId ? allRanked.find((r) => r.id === highlightedRiderId) ?? null : null),
    [allRanked, highlightedRiderId],
  )

  // Chega aqui vindo de "Meu treino" (?rider=<id>) assim que alguém termina
  // um treino — garante que a categoria certa fique visível e mantém o
  // destaque por alguns segundos enquanto o ranking carrega/atualiza.
  useEffect(() => {
    const riderId = new URLSearchParams(window.location.search).get('rider')
    if (!riderId) return

    setFilter('all')
    setHighlightedRiderId(riderId)
    window.history.replaceState(null, '', window.location.pathname)

    const timer = setTimeout(() => setHighlightedRiderId(null), 8000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:p-6 lg:gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bike className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-balance">PedalArena</h1>
            <p className="text-sm text-muted-foreground">
              Ranking histórico de treinos na bike ergométrica
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav
            className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1"
            aria-label="Filtrar por categoria"
          >
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  filter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </nav>

          <Link
            href="/treino"
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <User className="h-4 w-4" aria-hidden />
            Meu treino
          </Link>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {highlightedRider && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <Trophy className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p>
            Treino finalizado! <strong>{highlightedRider.name}</strong> ficou em{' '}
            <strong>{highlightedRider.rank}º lugar</strong> com {highlightedRider.km.toFixed(2)} km.
          </p>
        </div>
      )}

      <StatsBar riders={allRanked} totalSessions={totalSessions} />

      <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
        <div className="flex flex-col gap-4 lg:col-span-3 lg:gap-6">
          <VirtualTrack riders={ranked} />
          <Achievements riders={allRanked} />
        </div>
        <div className="lg:col-span-2">
          <Leaderboard riders={ranked} onSelect={setSelectedRider} highlightedId={highlightedRiderId} />
        </div>
      </div>

      <footer className="pt-2 text-center text-xs text-muted-foreground">
        {loading ? 'Conectando ao Supabase Bike_GM…' : 'Histórico de treinos via Supabase Bike_GM'}
      </footer>

      <RiderDetailModal
        rider={selectedRider}
        sessions={selectedRider ? sessionsByRider.get(selectedRider.id) ?? [] : []}
        onClose={() => setSelectedRider(null)}
      />
    </main>
  )
}
