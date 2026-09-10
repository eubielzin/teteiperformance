'use client'

import { Bike, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initials, type RankedRider } from '@/lib/riders'

function RankMedal({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: 'bg-accent text-accent-foreground',
    2: 'bg-muted-foreground/30 text-foreground',
    3: 'bg-[oklch(0.55_0.12_45)] text-foreground',
  }
  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
        styles[rank] ?? 'bg-secondary text-muted-foreground',
      )}
    >
      {rank}
    </div>
  )
}

export function Leaderboard({ riders }: { riders: RankedRider[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Trophy className="h-5 w-5 text-accent" aria-hidden />
        <h2 className="text-lg font-semibold tracking-tight">Ranking geral</h2>
        <span className="ml-auto text-xs text-muted-foreground">{riders.length} ciclistas</span>
      </div>

      <ol className="divide-y divide-border overflow-hidden">
        {riders.map((r) => (
          <li
            key={r.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 transition-colors',
              r.rank <= 3 && 'bg-primary/5',
            )}
          >
            <RankMedal rank={r.rank} />

            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: r.color, color: 'oklch(0.17 0.02 260)' }}
              aria-hidden
            >
              {initials(r.name)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.gym} · {r.category}
              </p>
            </div>

            <div className="text-right">
              <p className="font-mono text-sm font-semibold tabular-nums">
                {r.km.toFixed(2)} <span className="text-xs text-muted-foreground">km</span>
              </p>
              <p
                className={cn(
                  'flex items-center justify-end gap-1 text-xs tabular-nums',
                  r.active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Bike className="h-3 w-3" aria-hidden />
                {r.speed.toFixed(0)} km/h
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
