/**
 * 逻辑日：凌晨吃的东西算前一天。
 *
 * 直接按自然日切分会让「1:30 的夜宵」落到第二天，导致每天的对比失真。
 * 默认把一天从 04:00 开始算，可在设置里改。
 */

export const DEFAULT_DAY_START_HOUR = 4

const pad = (n: number) => String(n).padStart(2, '0')

/** 本地时区的 YYYY-MM-DD */
export function formatDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 时间戳 → 逻辑日 */
export function logicalDay(ts: number, dayStartHour: number = DEFAULT_DAY_START_HOUR): string {
  return formatDay(new Date(ts - dayStartHour * 3600_000))
}

/** YYYY-MM-DD → 本地当天 00:00 */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(day: string, offset: number): string {
  const date = parseDay(day)
  date.setDate(date.getDate() + offset)
  return formatDay(date)
}

/** 以 end 结尾、长度 count 的连续日期，升序 */
export function dayRange(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - count + 1))
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

export function weekdayShort(day: string): string {
  return WEEKDAYS[parseDay(day).getDay()]
}

export function dayLabel(day: string, today: string): string {
  if (day === today) return '今天'
  if (day === addDays(today, -1)) return '昨天'
  const date = parseDay(day)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** 当前时刻落在这个逻辑日的哪个时段，用于默认选中餐次 */
export function guessMeal(ts: number = Date.now()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date(ts).getHours()
  if (hour < 10) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}

export const MEAL_LABEL = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
} as const

export const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const
