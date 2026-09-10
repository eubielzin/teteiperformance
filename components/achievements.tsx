'use client'

import { Award, Flame, Medal, Rocket } from 'lucide-react'
import type { RankedRider } from '@/lib/riders'

export function Achievements({ riders }: { riders: RankedRider[] }) {
  if (riders.length === 0) return null

  const leader = riders[0]
  const fastest = [...riders].sort((a, b) => b.speed - a.speed)[0]
  const topCadence = [...riders].sort((a, b) => b.cadence - a.cadence)[0]
  const mostLaps = [...riders].sort((a, b) => b.lap - a.lap)[0]

  const badges = [
    {
      icon: <Medal className="h-5 w-5" aria-hidden />,
      title: 'Líder da arena',
      name: leader.name,
      detail: `${leader.km.toFixed(1)} km`,
      tone: 'text-accent bg-accent/15',
    },
    {
      icon: <Rocket className="h-5 w-5" aria-hidden />,
      title: 'Mais veloz',
      name: fastest.name,
      detail: `${fastest.speed.toFixed(0)} km/h`,
      tone: 'text-primary bg-primary/15',
    },
    {
      icon: <Flame className="h-5 w-5" aria-hidden />,
      title: 'Maior cadência',
      name: topCadence.name,
      detail: `${topCadence.cadence} rpm`,
      tone: 'text-[oklch(0.7_0.15_25)] bg-[oklch(0.7_0.15_25)]/15',
    },
    {
      icon: <Award className="h-5 w-5" aria-hidden />,
      title: 'Mais voltas',
      name: mostLaps.name,
      detail: `${mostLaps.lap} voltas`,
      tone: 'text-[oklch(0.7_0.15_200)] bg-[oklch(0.7_0.15_200)]/15',
    },
  ]

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">Conquistas ao vivo</h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {badges.map((b) => (
          <div key={b.title} className="rounded-xl border border-border bg-background/40 p-3">
            <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${b.tone}`}>
              {b.icon}
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{b.title}</p>
            <p className="truncate text-sm font-medium">{b.name}</p>
            <p className="font-mono text-sm font-semibold tabular-nums text-muted-foreground">
              {b.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
