/** 全局领域类型。营养值统一以「每 100g 可食部」为基准。 */

export type Sex = 'male' | 'female'
export type GoalType = 'cut' | 'maintain' | 'bulk'
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** 活动系数（PAL），对应久坐 / 轻度 / 中度 / 高强度 */
export type Activity = 1.2 | 1.375 | 1.55 | 1.725

export interface Profile {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: Activity
  goal: GoalType
  /** 每周目标体重变化（kg），减脂为正数、增肌为正数，方向由 goal 决定 */
  rateKgPerWeek: number
}

/** 一句「多少热量 + 三大营养素」，克数单位 */
export interface Macro {
  kcal: number
  p: number
  f: number
  c: number
}

export interface Portion {
  name: string
  grams: number
}

export interface Food {
  /** 内置食物用名称本身，自定义食物用 c 前缀 */
  id: string
  name: string
  aliases: string[]
  category: string
  per100: Macro
  portions: Portion[]
  /** 数据来源说明，用于展示溯源 */
  source: string
  /** 用户自建的食物，导出与统计时单独标记 */
  custom?: boolean
}

/** 一条摄入记录。营养值在写入时快照，之后改食物库不影响历史。 */
export interface Entry {
  id?: number
  /** 逻辑日 YYYY-MM-DD，受 dayStartHour 影响 */
  day: string
  ts: number
  meal: Meal
  foodId: string
  name: string
  grams: number
  kcal: number
  p: number
  f: number
  c: number
  source: 'db' | 'custom'
}

/** 目标带生效日期，改目标不会篡改历史 */
export interface Target {
  id?: number
  effectiveFrom: string
  kcal: number
  p: number
  f: number
  c: number
  /** 生成该目标时的档案快照，便于回看「当时为什么是这个数」 */
  snapshot: Profile
}
