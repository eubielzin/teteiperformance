'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bike, Gauge, MapPin, Play, Square, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { colorForId, rank, type Rider } from '@/lib/riders'
import { useTreino } from '@/hooks/use-treino'
import { VirtualTrack } from '@/components/virtual-track'

// A partir de quantos segundos restantes o cronômetro de preparo vira
// vermelho e pulsa, pra chamar mais atenção pro tempo acabando.
const COUNTDOWN_ALERT_THRESHOLD = 10

function formatTempo(segundos: number) {
  const total = Math.max(0, Math.round(segundos))
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// O FastAPI é uma fonte externa (fora do nosso controle) — protege contra
// campos ausentes/null/NaN em qualquer resposta pra não derrubar a tela.
function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function Metric({
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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3">
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

export function MeuTreino() {
  const {
    riderName,
    setRiderName,
    riderPhone,
    setRiderPhone,
    phase,
    countdown,
    rideCountdown,
    timedOut,
    status,
    error,
    iniciar,
    cancelarCountdown,
    finalizar,
    reiniciar,
  } = useTreino()

  const isRunning = phase === 'active' || phase === 'finishing'
  const isFinished = phase === 'finished'

  // Reaproveita a pista virtual do PedalArena: monta um único "rider" a partir
  // do status da sessão pra reusar exatamente o mesmo componente/visual.
  const trackRiders = useMemo(() => {
    if (!status) return []
    const rider: Rider = {
      id: 'meu-treino',
      name: riderName || 'Você',
      gym: '',
      category: 'Sub-30',
      color: colorForId(riderName || 'meu-treino'),
      km: num(status.distancia_km),
      speed: num(status.velocidade_atual_kmh),
      cadence: num(status.rpm),
      active: Boolean(status.ativa),
    }
    return rank([rider])
  }, [status, riderName])

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Voltar para a arena"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Meu treino</h1>
          <p className="text-sm text-muted-foreground">Sessão individual conectada direto à bike</p>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {phase === 'idle' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <label htmlFor="rider-name" className="text-sm font-medium">
            Seu nome
          </label>
          <input
            id="rider-name"
            value={riderName}
            onChange={(e) => setRiderName(e.target.value)}
            placeholder="Como podemos te chamar?"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <label htmlFor="rider-phone" className="text-sm font-medium">
            Número de celular
          </label>
          <input
            id="rider-phone"
            type="tel"
            inputMode="tel"
            value={riderPhone}
            onChange={(e) => setRiderPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={iniciar}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="h-4 w-4" aria-hidden />
            Iniciar treino
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Prepare-se! Seu treino começa em</p>
          <p
            className={cn(
              'font-mono text-8xl font-black tabular-nums transition-colors duration-300 md:text-9xl',
              countdown <= COUNTDOWN_ALERT_THRESHOLD
                ? 'animate-countdown-alert text-destructive'
                : 'text-primary',
            )}
          >
            {countdown}s
          </p>
          <button
            type="button"
            onClick={cancelarCountdown}
            className="mt-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
          >
            Cancelar
          </button>
        </div>
      )}

      {phase === 'starting' && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Conectando com a bike…
        </div>
      )}

      {status && (isRunning || isFinished) && (
        <VirtualTrack riders={trackRiders} />
      )}

      {status && (isRunning || isFinished) && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ciclista</p>
              <p className="text-lg font-semibold">{riderName}</p>
            </div>
            {isRunning && (
              <div className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <span className="text-xs font-medium text-primary">PEDALANDO</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric icon={<MapPin className="h-5 w-5" aria-hidden />} label="Distância" value={num(status.distancia_km).toFixed(2)} unit="km" />
            <Metric icon={<Gauge className="h-5 w-5" aria-hidden />} label="Velocidade" value={num(status.velocidade_atual_kmh).toFixed(1)} unit="km/h" />
            <Metric icon={<Timer className="h-5 w-5" aria-hidden />} label="Tempo" value={formatTempo(num(status.tempo_segundos))} />
            <Metric icon={<Bike className="h-5 w-5" aria-hidden />} label="Rotações" value={String(num(status.rotacoes))} />
            {isRunning && (
              <Metric icon={<Timer className="h-5 w-5" aria-hidden />} label="Tempo restante" value={formatTempo(rideCountdown)} />
            )}
          </div>

          {isRunning && (
            <button
              type="button"
              onClick={finalizar}
              disabled={phase === 'finishing'}
              className={cn(
                'mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-destructive hover:text-destructive',
                phase === 'finishing' && 'opacity-60',
              )}
            >
              <Square className="h-4 w-4" aria-hidden />
              {phase === 'finishing' ? 'Finalizando…' : 'Finalizar treino'}
            </button>
          )}

          {isFinished && timedOut && (
            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center">
              <p className="text-sm font-semibold text-destructive">Tempo esgotado!</p>
              <p className="text-xs text-muted-foreground">Seu percurso chegou ao fim e a corrida foi encerrada automaticamente.</p>
              <button
                type="button"
                onClick={reiniciar}
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Play className="h-4 w-4" aria-hidden />
                Iniciar nova corrida
              </button>
            </div>
          )}

          {isFinished && !timedOut && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-center text-sm text-primary">Treino finalizado e salvo no histórico 🎉</p>
              <button
                type="button"
                onClick={reiniciar}
                className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Play className="h-4 w-4" aria-hidden />
                Novo treino
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
