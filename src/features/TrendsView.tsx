import { useEffect, useState } from 'react'
import { dayLabel, dayRange, weekdayShort } from '../core/day'
import type { Macro, Target } from '../core/types'
import { totalsByDay } from '../storage/repo'

interface TrendsViewProps {
  today: string
  target: Target | null
}

const W = 320
const H = 152
const TOP = 10
const BOTTOM = 114
const PAD = 8

export function TrendsView({ today, target }: TrendsViewProps) {
  const [data, setData] = useState<Record<string, Macro> | null>(null)
  const days = dayRange(today, 7)

  useEffect(() => {
    let alive = true
    void totalsByDay(dayRange(today, 7)).then((result) => {
      if (alive) setData(result)
    })
    return () => {
      alive = false
    }
  }, [today, target])

  if (!data) return <div className="empty">加载中…</div>

  const values = days.map((day) => data[day]?.kcal ?? 0)
  const goal = target?.kcal ?? 0
  const max = Math.max(...values, goal, 1) * 1.18
  const slot = (W - PAD * 2) / days.length
  const barW = Math.min(22, slot * 0.5)

  const yOf = (kcal: number) => BOTTOM - (kcal / max) * (BOTTOM - TOP)

  const logged = values.filter((value) => value > 0)
  const average = logged.length > 0 ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0
  const onTarget = goal > 0 ? values.filter((v) => v > 0 && v <= goal).length : 0
  const extreme = Math.max(...values)

  return (
    <div>
      <div className="card">
        <h3>最近 7 天</h3>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="最近七天热量柱状图">
          {goal > 0 && (
            <>
              <line
                x1={PAD}
                x2={W - PAD}
                y1={yOf(goal)}
                y2={yOf(goal)}
                stroke="#BA7517"
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.7}
              />
              <text x={W - PAD} y={yOf(goal) - 4} textAnchor="end">
                目标 {goal}
              </text>
            </>
          )}

          {days.map((day, index) => {
            const value = values[index]
            const x = PAD + slot * index + (slot - barW) / 2
            const y = yOf(value)
            const height = Math.max(value > 0 ? 2 : 0, BOTTOM - y)
            const over = goal > 0 && value > goal
            const isToday = day === today
            return (
              <g key={day}>
                <rect
                  x={x}
                  y={BOTTOM - height}
                  width={barW}
                  height={height}
                  rx={4}
                  fill={over ? 'var(--danger)' : 'var(--accent)'}
                  opacity={isToday ? 1 : 0.55}
                />
                {value > 0 && (
                  <text x={x + barW / 2} y={BOTTOM - height - 5} textAnchor="middle">
                    {value}
                  </text>
                )}
                <text x={x + barW / 2} y={BOTTOM + 14} textAnchor="middle">
                  {isToday ? '今' : weekdayShort(day)}
                </text>
              </g>
            )
          })}
        </svg>

        <div className="stat-row">
          <div className="stat">
            <b>{average || '—'}</b>
            <small>日均 kcal</small>
          </div>
          <div className="stat">
            <b>
              {onTarget}
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>/{logged.length || 0}</span>
            </b>
            <small>未超目标天数</small>
          </div>
          <div className="stat">
            <b>{extreme || '—'}</b>
            <small>最高一天</small>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>怎么看这张图</h3>
        <div className="hint" style={{ marginTop: 8 }}>
          虚线是你的每日目标，柱子超过虚线就是当天吃超了。没有柱子的日子表示那天没记录——
          空档不等于没吃，别把它当成「那天吃得少」。
        </div>
      </div>

      <div className="card">
        <h3>按天明细</h3>
        {[...days].reverse().map((day) => {
          const item = data[day]
          return (
            <div className="row-btn" key={day}>
              {dayLabel(day, today)}
              <span>
                {item && item.kcal > 0
                  ? `${item.kcal} kcal · 蛋白 ${item.p}g`
                  : '无记录'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
