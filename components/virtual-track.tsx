'use client'

import { initials, type RankedRider } from '@/lib/riders'

const CX = 400
const CY = 210
const RX = 330
const RY = 150

function pointOnTrack(progress: number, laneOffset = 0) {
  // começa no topo e segue no sentido horário
  const angle = -Math.PI / 2 + progress * Math.PI * 2
  const rx = RX - laneOffset
  const ry = RY - laneOffset
  return {
    x: CX + rx * Math.cos(angle),
    y: CY + ry * Math.sin(angle),
  }
}

export function VirtualTrack({ riders }: { riders: RankedRider[] }) {
  // desenhamos os líderes na frente (z-order), então os 8 primeiros
  const shown = riders.slice(0, 8)

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Pista virtual</h2>
          <p className="text-sm text-muted-foreground">
            Cada volta equivale a 400&nbsp;m pedalados
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-xs font-medium text-primary">AO VIVO</span>
        </div>
      </div>

      <svg
        viewBox="0 0 800 420"
        className="w-full"
        role="img"
        aria-label="Pista de corrida virtual com a posição de cada ciclista"
      >
        {/* asfalto */}
        <ellipse
          cx={CX}
          cy={CY}
          rx={RX}
          ry={RY}
          fill="none"
          stroke="oklch(0.28 0.03 260)"
          strokeWidth={52}
        />
        {/* bordas */}
        <ellipse cx={CX} cy={CY} rx={RX + 26} ry={RY + 26} fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth={2} />
        <ellipse cx={CX} cy={CY} rx={RX - 26} ry={RY - 26} fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth={2} />
        {/* linha central tracejada */}
        <ellipse
          cx={CX}
          cy={CY}
          rx={RX}
          ry={RY}
          fill="none"
          stroke="oklch(0.7 0.02 260)"
          strokeWidth={2}
          strokeDasharray="10 14"
          opacity={0.5}
        />

        {/* linha de largada/chegada */}
        <line
          x1={CX}
          y1={CY - RY - 28}
          x2={CX}
          y2={CY - RY + 28}
          stroke="oklch(0.97 0.005 260)"
          strokeWidth={4}
          strokeDasharray="6 6"
        />

        {shown.map((r, i) => {
          // pequeno deslocamento de faixa por posição para evitar sobreposição total
          const lane = (i % 3) * 12 - 12
          const p = pointOnTrack(r.progress, lane)
          const isLeader = r.rank === 1
          return (
            <g
              key={r.id}
              className="transition-transform duration-500 ease-linear"
              style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
            >
              {isLeader && (
                <circle r={20} fill="none" stroke={r.color} strokeWidth={2} opacity={0.5}>
                  <animate attributeName="r" values="16;22;16" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r={13} fill={r.color} stroke="oklch(0.17 0.02 260)" strokeWidth={2} />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={700}
                fill="oklch(0.17 0.02 260)"
              >
                {initials(r.name)}
              </text>
            </g>
          )
        })}

        {/* leva no centro da pista */}
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          fontSize={13}
          fill="oklch(0.7 0.02 260)"
          letterSpacing={2}
        >
          VOLTA DO LÍDER
        </text>
        <text
          x={CX}
          y={CY + 24}
          textAnchor="middle"
          fontSize={34}
          fontWeight={800}
          fill="oklch(0.86 0.2 130)"
        >
          {shown[0] ? shown[0].lap : 0}
        </text>
      </svg>
    </div>
  )
}
