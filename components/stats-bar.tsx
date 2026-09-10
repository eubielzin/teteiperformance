'use client'

import { Gauge, MapPin, Users, Zap } from 'lucide-react'
import type { RankedRider } from '@/lib/riders'

function Stat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-mono text-xl font-semibold tabular-nums leading-tight">
          {value}
          {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
        </p>
      </div>
    </div>
  )
}

export function StatsBar({ riders, totalSessions }: { riders: RankedRider[]; totalSessions: number }) {
  const totalKm = riders.reduce((sum, r) => sum + r.km, 0)
  const topSpeed = Math.max(...riders.map((r) => r.speed), 0)

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        icon={<MapPin className="h-5 w-5" aria-hidden />}
        label="Distância total"
        value={totalKm.toFixed(1)}
        unit="km"
      />
      <Stat
        icon={<Users className="h-5 w-5" aria-hidden />}
        label="Ciclistas"
        value={String(riders.length)}
      />
      <Stat
        icon={<Zap className="h-5 w-5" aria-hidden />}
        label="Recorde de velocidade"
        value={topSpeed.toFixed(0)}
        unit="km/h"
      />
      <Stat
        icon={<Gauge className="h-5 w-5" aria-hidden />}
        label="Treinos"
        value={String(totalSessions)}
      />
    </div>
  )
}
