/**
 * 营养学计算：Mifflin-St Jeor 基础代谢、TDEE、每日目标与宏量分配。
 *
 * 所有公式都做成纯函数，不依赖任何平台能力，便于单测与跨端复用。
 */
import type { GoalType, Macro, Profile } from './types'

/** 1 kg 脂肪约等于 7700 kcal */
export const KCAL_PER_KG_FAT = 7700

/** 每日摄入安全下限，低于此值不生成目标 */
export const CALORIE_FLOOR = { male: 1500, female: 1200 } as const

/** 减脂缺口上限 750 kcal/日，超过会明显掉肌肉 */
export const MAX_CUT_DELTA = 750
/** 增肌盈余上限 500 kcal/日，再多只是长脂肪 */
export const MAX_BULK_DELTA = 500

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** 保留一位小数；加极小偏置抵消浮点误差（38.85 不应被舍成 38.8） */
const round1 = (n: number) => Math.round(n * 10 + (n >= 0 ? 1e-9 : -1e-9)) / 10

/** Mifflin-St Jeor：比 Harris-Benedict 更准，是当前默认推荐 */
export function bmr(profile: Profile): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age
  return profile.sex === 'male' ? base + 5 : base - 161
}

/** 总能量消耗 = 基础代谢 × 活动系数 */
export function tdee(profile: Profile): number {
  return bmr(profile) * profile.activity
}

/** 由「每周想变多少 kg」换算成每日热量差 */
export function dailyDelta(profile: Profile): number {
  if (profile.goal === 'maintain') return 0
  const raw = (profile.rateKgPerWeek * KCAL_PER_KG_FAT) / 7
  const signed = profile.goal === 'cut' ? -raw : raw
  return clamp(signed, -MAX_CUT_DELTA, MAX_BULK_DELTA)
}

export interface TargetResult {
  /** 最终每日热量目标 */
  kcal: number
  bmr: number
  tdee: number
  /** 相对 TDEE 的差值，负数表示缺口 */
  delta: number
  /** 是否因为触碰安全下限被上调 */
  clamped: boolean
  floor: number
}

/** 每日热量目标：TDEE + 目标差，并保证不低于安全下限 */
export function calorieTarget(profile: Profile): TargetResult {
  const basal = bmr(profile)
  const total = tdee(profile)
  const delta = dailyDelta(profile)
  const floor = CALORIE_FLOOR[profile.sex]
  const raw = total + delta
  const kcal = Math.max(floor, raw)
  return {
    kcal: Math.round(kcal),
    bmr: Math.round(basal),
    tdee: Math.round(total),
    delta: Math.round(kcal - total),
    clamped: raw < floor,
    floor,
  }
}

export interface MacroTarget extends Macro {
  /** 三大营养素供能占比，用于展示合规区间 */
  pPct: number
  fPct: number
  cPct: number
}

/** 每公斤体重的蛋白质目标（g/kg），按目标区分 */
const PROTEIN_PER_KG: Record<GoalType, number> = {
  cut: 1.6,
  bulk: 1.8,
  maintain: 1.4,
}

/**
 * 三大营养素分配：
 *   蛋白按体重定 → 脂肪占 25% 热量 → 碳水吃掉剩余。
 * 不用 AMDR 百分比反推，因为蛋白质需求本质上是按体重算的。
 */
export function macroTarget(kcal: number, weightKg: number, goal: GoalType): MacroTarget {
  let p = PROTEIN_PER_KG[goal] * weightKg
  // 蛋白质供能不超过 35%，避免极端体重下挤掉其他营养素
  p = Math.min(p, (kcal * 0.35) / 4)

  let f = (kcal * 0.25) / 9
  let c = (kcal - p * 4 - f * 9) / 4

  // 兜底：若碳水被算成负数，先压脂肪再压蛋白
  if (c < 0) {
    f = Math.max(0, (kcal - p * 4 - 40 * 4) / 9)
    c = Math.max(0, (kcal - p * 4 - f * 9) / 4)
    if (c === 0) {
      p = Math.max(0, (kcal - f * 9) / 4)
    }
  }

  p = round1(p)
  f = round1(f)
  c = round1(c)

  const toPct = (grams: number, k: number) =>
    kcal > 0 ? Math.round(((grams * k) / kcal) * 100) : 0

  return {
    kcal: Math.round(kcal),
    p,
    f,
    c,
    pPct: toPct(p, 4),
    fPct: toPct(f, 9),
    cPct: toPct(c, 4),
  }
}

/** 用 4/9/4 法则反算热量，用于校验食物数据自洽性 */
export function kcalFromMacros(m: Pick<Macro, 'p' | 'f' | 'c'>): number {
  return m.p * 4 + m.f * 9 + m.c * 4
}

/** 体重变化预测：按当前缺口，多久到目标 */
export function weeksToGoal(deltaPerDay: number, deltaKg: number): number | null {
  if (deltaPerDay === 0) return null
  const perDay = Math.abs(deltaPerDay) / KCAL_PER_KG_FAT
  if (perDay === 0) return null
  return Math.abs(deltaKg) / perDay / 7
}
