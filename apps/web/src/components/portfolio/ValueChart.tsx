'use client'

import { useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { PortfolioSnapshot } from '@/app/actions/vault'

interface ValueChartProps {
  data: PortfolioSnapshot[]
  height?: number
}

export function ValueChart({ data, height = 200 }: ValueChartProps) {
  const { points, xLabels, yMin, yMax, pathD, areaD } = useMemo(() => {
    if (data.length === 0) return { points: [], xLabels: [], yMin: 0, yMax: 0, pathD: '', areaD: '' }

    const values    = data.map((d) => d.total_value)
    const yMin      = Math.min(...values) * 0.95
    const yMax      = Math.max(...values) * 1.05
    const yRange    = yMax - yMin || 1

    const W = 800
    const H = height
    const PAD = { top: 16, right: 16, bottom: 32, left: 64 }
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom

    const toX = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * innerW
    const toY = (v: number) => PAD.top + innerH - ((v - yMin) / yRange) * innerH

    const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.total_value), day: d.day, value: d.total_value }))

    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = [
      `M ${pts[0].x} ${H - PAD.bottom}`,
      ...pts.map((p) => `L ${p.x} ${p.y}`),
      `L ${pts[pts.length - 1].x} ${H - PAD.bottom}`,
      'Z',
    ].join(' ')

    // X-axis labels — show first, mid, last
    const labelIndices = [0, Math.floor(data.length / 2), data.length - 1].filter(
      (v, i, arr) => arr.indexOf(v) === i
    )
    const xLabels = labelIndices.map((i) => ({
      x:   toX(i),
      label: new Date(data[i].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))

    return { points: pts, xLabels, yMin, yMax, pathD, areaD }
  }, [data, height])

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-neutral-600 text-sm"
        style={{ height }}
      >
        No price history yet — price data appears after the first cron run.
      </div>
    )
  }

  const W = 800
  const PAD_BOTTOM = 32
  const PAD_LEFT = 64

  // Y-axis labels
  const yLabels = [yMin, (yMin + yMax) / 2, yMax].map((v, i) => ({
    y: height - PAD_BOTTOM - (i / 2) * (height - 16 - PAD_BOTTOM),
    label: formatCurrency(v),
  }))

  const trend = data.length > 1
    ? data[data.length - 1].total_value - data[0].total_value
    : 0
  const isPositive = trend >= 0

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Portfolio value over time"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={isPositive ? '#6366f1' : '#ef4444'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isPositive ? '#6366f1' : '#ef4444'} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((yl, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT} y1={yl.y}
              x2={W - 16}   y2={yl.y}
              stroke="#262626" strokeWidth="1"
            />
            <text
              x={PAD_LEFT - 8} y={yl.y + 4}
              textAnchor="end"
              fill="#737373"
              fontSize="11"
            >
              {yl.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGrad)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={isPositive ? '#6366f1' : '#ef4444'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points (only render if ≤ 30) */}
        {points.length <= 30 && points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3"
            fill={isPositive ? '#6366f1' : '#ef4444'}
            stroke="#0a0a0a" strokeWidth="2"
          />
        ))}

        {/* X-axis labels */}
        {xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x} y={height - 6}
            textAnchor="middle"
            fill="#737373"
            fontSize="11"
          >
            {xl.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
