'use client'

import { useEffect } from 'react'
import { Bike, Calendar, Download, Gauge, MapPin, Phone, X } from 'lucide-react'
import { initials, type RankedRider } from '@/lib/riders'
import type { SessionRecord } from '@/types/session'

function formatDuration(totalSeconds: number) {
  const total = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`
  return `${m}min ${String(s).padStart(2, '0')}s`
}

function formatDate(value: string | null) {
  if (!value) return 'Data não registrada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data não registrada'
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// Importa o jsPDF sob demanda (só quando alguém clica em "Baixar PDF"),
// pra não engordar o bundle inicial do dashboard com uma lib que nem
// sempre é usada.
async function downloadPdf(rider: RankedRider, sessions: SessionRecord[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  let y = 20

  doc.setFontSize(18)
  doc.text('PedalArena — Relatório do ciclista', 14, y)
  y += 10

  doc.setFontSize(11)
  doc.text(`Nome: ${rider.name}`, 14, y)
  y += 7
  doc.text(`Telefone para contato: ${rider.phone || 'não informado'}`, 14, y)
  y += 7
  doc.text(`Categoria: ${rider.category}`, 14, y)
  y += 10

  doc.setFontSize(13)
  doc.text('Resumo geral', 14, y)
  y += 7
  doc.setFontSize(11)
  doc.text(`Distância total: ${rider.km.toFixed(2)} km`, 14, y)
  y += 6
  doc.text(`Melhor velocidade média: ${rider.speed.toFixed(1)} km/h`, 14, y)
  y += 6
  doc.text(`Cadência média: ${rider.cadence} rpm`, 14, y)
  y += 6
  doc.text(`Treinos registrados: ${sessions.length}`, 14, y)
  y += 10

  doc.setFontSize(13)
  doc.text('Histórico de percursos', 14, y)
  y += 8
  doc.setFontSize(10)

  if (sessions.length === 0) {
    doc.text('Nenhum treino registrado ainda.', 14, y)
  }

  sessions.forEach((s, i) => {
    if (y > 275) {
      doc.addPage()
      y = 20
    }
    doc.text(
      `${i + 1}. ${formatDate(s.started_at)} - ${Number(s.distance_km).toFixed(2)} km, ` +
        `${Number(s.avg_speed_kmh).toFixed(1)} km/h, ${formatDuration(s.duration_seconds)}, ` +
        `${s.rotations} rotacoes`,
      14,
      y,
    )
    y += 6
  })

  const fileSlug = rider.name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-') || 'ciclista'
  doc.save(`pedalarena-${fileSlug}.pdf`)
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-mono text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function RiderDetailModal({
  rider,
  sessions,
  onClose,
}: {
  rider: RankedRider | null
  sessions: SessionRecord[]
  onClose: () => void
}) {
  // Fecha com Esc, e trava o scroll da página por trás enquanto o modal
  // estiver aberto.
  useEffect(() => {
    if (!rider) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [rider, onClose])

  if (!rider) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${rider.name}`}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{ backgroundColor: rider.color, color: 'oklch(0.17 0.02 260)' }}
            aria-hidden
          >
            {initials(rider.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold leading-tight">{rider.name}</p>
            <p className="truncate text-xs text-muted-foreground">{rider.category}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-background/40 px-4 py-2.5 text-sm">
            <Phone className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-muted-foreground">Contato:</span>
            <span className="font-medium">{rider.phone || 'não informado'}</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <Stat
              icon={<MapPin className="h-4 w-4" aria-hidden />}
              label="Distância total"
              value={`${rider.km.toFixed(2)} km`}
            />
            <Stat
              icon={<Gauge className="h-4 w-4" aria-hidden />}
              label="Melhor vel. média"
              value={`${rider.speed.toFixed(1)} km/h`}
            />
            <Stat
              icon={<Bike className="h-4 w-4" aria-hidden />}
              label="Cadência média"
              value={`${rider.cadence} rpm`}
            />
            <Stat
              icon={<Calendar className="h-4 w-4" aria-hidden />}
              label="Treinos"
              value={String(sessions.length)}
            />
          </div>

          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Histórico de percursos</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum treino registrado ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sessions.map((s) => (
                <li key={s.id} className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{formatDate(s.started_at)}</p>
                  <p className="font-mono tabular-nums">
                    {Number(s.distance_km).toFixed(2)} km · {Number(s.avg_speed_kmh).toFixed(1)} km/h ·{' '}
                    {formatDuration(s.duration_seconds)} · {s.rotations} rot.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={() => downloadPdf(rider, sessions)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Download className="h-4 w-4" aria-hidden />
            Baixar PDF
          </button>
        </div>
      </div>
    </div>
  )
}
