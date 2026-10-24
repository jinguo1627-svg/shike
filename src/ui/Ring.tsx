interface RingProps {
  consumed: number
  target: number
}

const SIZE = 208
const STROKE = 15
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * 今日热量环。
 * 超出目标时环变红、中心数字变成「+超出量」，避免「已经吃超了还显示还剩 0」的错觉。
 */
export function Ring({ consumed, target }: RingProps) {
  const ratio = target > 0 ? consumed / target : 0
  const filled = Math.min(ratio, 1)
  const over = ratio > 1.0001
  const remaining = Math.round(target - consumed)
  const color = over ? 'var(--danger)' : 'var(--accent)'

  return (
    <div className="ring-wrap">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="ring-svg" role="img" aria-label="今日热量进度">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--line)"
          strokeWidth={STROKE}
        />
        <circle
          className="progress"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${filled * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="ring-center">
        <div className="ring-value" style={{ color: over ? 'var(--danger)' : 'var(--ink)' }}>
          {over ? `+${Math.abs(remaining)}` : remaining}
        </div>
        <div className="ring-label">{over ? 'kcal 已超出' : 'kcal 还可摄入'}</div>
      </div>
    </div>
  )
}
