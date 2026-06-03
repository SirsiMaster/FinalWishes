/**
 * SettlementGantt — Visual Gantt Timeline for Probate Deadlines
 *
 * Renders a horizontal bar chart using Recharts showing each probate deadline
 * as a timeline bar from today to its due date. Color-coded by urgency.
 *
 * @version 1.0.0
 */
import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { Deadline } from '@/lib/probate'

interface SettlementGanttProps {
  deadlines: Deadline[]
  /** Date of death (ISO string) — the timeline origin */
  dateOfDeath?: string
}

interface GanttBar {
  name: string
  start: number
  duration: number
  dueDate: string
  overdue: boolean
  daysFromNow: number
}

function getBarColor(overdue: boolean, daysFromNow: number): string {
  if (overdue) return '#EF4444'       // Red
  if (daysFromNow <= 14) return '#F59E0B' // Amber
  if (daysFromNow <= 60) return '#3B82F6' // Blue
  return '#22C55E'                        // Green
}

export function SettlementGantt({ deadlines, dateOfDeath }: SettlementGanttProps) {
  const { bars, todayOffset, maxDay } = useMemo(() => {
    if (!deadlines.length) return { bars: [], todayOffset: 0, maxDay: 365 }

    const now = new Date()
    const origin = dateOfDeath ? new Date(dateOfDeath) : now

    const daysSince = (date: Date) =>
      Math.round((date.getTime() - origin.getTime()) / (1000 * 60 * 60 * 24))

    const todayDay = daysSince(now)

    const ganttBars: GanttBar[] = deadlines.map((d) => {
      const dueDate = new Date(d.dueDate)
      const dueDayOffset = daysSince(dueDate)
      // Bar starts from today (or from origin for overdue items)
      const barStart = d.overdue ? dueDayOffset : todayDay
      const barDuration = d.overdue
        ? todayDay - dueDayOffset // overdue: extends past due date to today
        : dueDayOffset - todayDay  // upcoming: extends from today to due date

      return {
        name: d.name.length > 30 ? d.name.slice(0, 28) + '…' : d.name,
        start: Math.min(barStart, dueDayOffset),
        duration: Math.max(Math.abs(barDuration), 1),
        dueDate: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        overdue: d.overdue,
        daysFromNow: d.daysFromNow,
      }
    })

    // Sort: overdue first, then by days from now ascending
    ganttBars.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
      return a.daysFromNow - b.daysFromNow
    })

    const allEndpoints = ganttBars.map((b) => b.start + b.duration)
    const maxEndpoint = Math.max(...allEndpoints, todayDay + 30)

    return { bars: ganttBars, todayOffset: todayDay, maxDay: maxEndpoint + 14 }
  }, [deadlines, dateOfDeath])

  if (!bars.length) return null

  const chartHeight = Math.max(bars.length * 44 + 60, 200)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={bars}
          layout="vertical"
          margin={{ top: 8, right: 40, left: 8, bottom: 8 }}
          barCategoryGap="20%"
        >
          <XAxis
            type="number"
            domain={[0, maxDay]}
            tick={{ fontSize: 11, fill: 'var(--color-slate-500)' }}
            tickFormatter={(day: number) => {
              if (dateOfDeath) {
                const d = new Date(dateOfDeath)
                d.setDate(d.getDate() + day)
                return d.toLocaleDateString('en-US', { month: 'short' })
              }
              return `Day ${day}`
            }}
            axisLine={{ stroke: 'var(--color-slate-200)' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fontSize: 11, fill: 'var(--color-slate-900)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as GanttBar
              return (
                <div className="bg-white border border-slate-900/10 rounded-xl px-4 py-3 shadow-lg text-sm">
                  <p className="font-semibold text-slate-900">{d.name}</p>
                  <p className="text-slate-900/60 text-xs mt-1">
                    Due: {d.dueDate}
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${d.overdue ? 'text-red-600' : 'text-slate-900/50'}`}>
                    {d.overdue
                      ? `${Math.abs(d.daysFromNow)} days overdue`
                      : `${d.daysFromNow} days remaining`}
                  </p>
                </div>
              )
            }}
          />
          {/* Today marker */}
          <ReferenceLine
            x={todayOffset}
            stroke="var(--gold)"
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{
              value: 'Today',
              position: 'top',
              fill: 'var(--gold)',
              fontSize: 11,
              fontWeight: 700,
            }}
          />
          {/* Invisible bar for offset (start position) */}
          <Bar dataKey="start" stackId="gantt" fill="transparent" radius={0} />
          {/* Visible bar for duration */}
          <Bar dataKey="duration" stackId="gantt" radius={[4, 4, 4, 4]}>
            {bars.map((bar, i) => (
              <Cell key={i} fill={getBarColor(bar.overdue, bar.daysFromNow)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] font-medium uppercase tracking-wider text-slate-900/50">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Due &le; 14d
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Due &le; 60d
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Due &gt; 60d
        </span>
      </div>
    </div>
  )
}
