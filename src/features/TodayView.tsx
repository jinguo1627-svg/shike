import { MEAL_LABEL, MEAL_ORDER } from '../core/day'
import type { Entry, Target } from '../core/types'
import { sumMacros } from '../core/units'
import { Ring } from '../ui/Ring'

interface TodayViewProps {
  entries: Entry[]
  target: Target | null
  onDelete: (id: number) => void
}

function MacroBar({
  label,
  value,
  goal,
  kind,
}: {
  label: string
  value: number
  goal: number
  kind: 'p' | 'f' | 'c'
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0
  return (
    <div className="macro">
      <div className="macro-top">
        <span>{label}</span>
        <span className="macro-val">
          {Math.round(value)}
          <span style={{ color: 'var(--ink-3)' }}> / {Math.round(goal)}g</span>
        </span>
      </div>
      <div className={`bar ${kind}`}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function TodayView({ entries, target, onDelete }: TodayViewProps) {
  const totals = sumMacros(entries)
  const goal = target ?? { kcal: 0, p: 0, f: 0, c: 0 }

  return (
    <div>
      <div className="ring-card">
        <Ring consumed={totals.kcal} target={goal.kcal} />
        <p className="ring-sub">
          目标 {goal.kcal} kcal · 已摄入 {totals.kcal} kcal
        </p>
        <div className="macros">
          <MacroBar label="蛋白" value={totals.p} goal={goal.p} kind="p" />
          <MacroBar label="脂肪" value={totals.f} goal={goal.f} kind="f" />
          <MacroBar label="碳水" value={totals.c} goal={goal.c} kind="c" />
        </div>
      </div>

      {entries.length === 0 && (
        <div className="empty">
          今天还没有记录
          <br />
          点右下角加号，搜一个食物试试
        </div>
      )}

      {MEAL_ORDER.map((meal) => {
        const items = entries.filter((entry) => entry.meal === meal)
        if (items.length === 0) return null
        const mealKcal = items.reduce((sum, item) => sum + item.kcal, 0)
        return (
          <section className="meal" key={meal}>
            <div className="meal-head">
              <strong>{MEAL_LABEL[meal]}</strong>
              <span className="kcal">{mealKcal} kcal</span>
            </div>
            <div className="entries">
              {items.map((item) => (
                <div className="entry" key={item.id}>
                  <div className="entry-main">
                    <div className="entry-name">{item.name}</div>
                    <div className="entry-meta">
                      {item.grams}g · 蛋白 {item.p}g · 脂肪 {item.f}g · 碳水 {item.c}g
                    </div>
                  </div>
                  <div className="entry-kcal num">{item.kcal}</div>
                  <button
                    className="entry-del"
                    aria-label={`删除 ${item.name}`}
                    onClick={() => item.id != null && onDelete(item.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
