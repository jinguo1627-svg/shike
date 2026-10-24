/** 存储层：把 Dexie 的读写收口成业务动作，界面只调用这里。 */
import { logicalDay } from '../core/day'
import { calorieTarget, macroTarget } from '../core/nutrition'
import type { Entry, Food, Macro, Meal, Profile, Target } from '../core/types'
import { scale, sumMacros } from '../core/units'
import { FOODS } from '../data/foods'
import { db, type ProfileRow } from './db'

export const DEFAULT_PROFILE: ProfileRow = {
  id: 1,
  sex: 'male',
  age: 22,
  heightCm: 175,
  weightKg: 70,
  activity: 1.375,
  goal: 'maintain',
  rateKgPerWeek: 0.4,
  dayStartHour: 4,
}

// ------------------------------------------------------------------
// 档案
// ------------------------------------------------------------------
export async function getProfile(): Promise<ProfileRow> {
  const row = await db.profile.get(1)
  if (row) return row
  await db.profile.put(DEFAULT_PROFILE)
  return DEFAULT_PROFILE
}

/** 改档案后，从当天起生成新目标；历史目标不动 */
export async function saveProfile(patch: Partial<Omit<ProfileRow, 'id'>>): Promise<ProfileRow> {
  const current = await getProfile()
  const next: ProfileRow = { ...current, ...patch, id: 1 }
  await db.profile.put(next)
  await setTargetFor(next, logicalDay(Date.now(), next.dayStartHour))
  return next
}

// ------------------------------------------------------------------
// 目标（按生效日期分版本）
// ------------------------------------------------------------------
export function targetFromProfile(profile: ProfileRow, effectiveFrom: string): Target {
  const result = calorieTarget(profile)
  const macros = macroTarget(result.kcal, profile.weightKg, profile.goal)
  const snapshot: Profile = {
    sex: profile.sex,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activity: profile.activity,
    goal: profile.goal,
    rateKgPerWeek: profile.rateKgPerWeek,
  }
  return {
    effectiveFrom,
    kcal: macros.kcal,
    p: macros.p,
    f: macros.f,
    c: macros.c,
    snapshot,
  }
}

export async function setTargetFor(profile: ProfileRow, day: string): Promise<Target> {
  const target = targetFromProfile(profile, day)
  const existing = await db.targets.where('effectiveFrom').equals(day).first()
  if (existing?.id) {
    await db.targets.update(existing.id, target)
    return { ...target, id: existing.id }
  }
  const id = await db.targets.add(target)
  return { ...target, id }
}

/** 取某一天生效的目标：最后一条 effectiveFrom <= day 的记录 */
export async function getTargetFor(day: string): Promise<Target | null> {
  const all = await db.targets.orderBy('effectiveFrom').toArray()
  if (all.length === 0) return null
  const eligible = all.filter((t) => t.effectiveFrom <= day)
  return eligible.length > 0 ? eligible[eligible.length - 1] : all[0]
}

export async function getOrCreateTarget(day: string): Promise<Target> {
  const existing = await getTargetFor(day)
  if (existing) return existing
  const profile = await getProfile()
  return setTargetFor(profile, day)
}

// ------------------------------------------------------------------
// 记录
// ------------------------------------------------------------------
export interface NewEntryInput {
  food: Food
  grams: number
  meal: Meal
  day: string
  ts?: number
}

export async function addEntry(input: NewEntryInput): Promise<number> {
  const { food, grams, meal, day, ts = Date.now() } = input
  const macros = scale(food.per100, grams)
  const entry: Entry = {
    day,
    ts,
    meal,
    foodId: food.id,
    name: food.name,
    grams,
    kcal: macros.kcal,
    p: macros.p,
    f: macros.f,
    c: macros.c,
    source: food.custom ? 'custom' : 'db',
  }
  return db.entries.add(entry)
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id)
}

export async function entriesForDay(day: string): Promise<Entry[]> {
  return db.entries.where('day').equals(day).sortBy('ts')
}

/** 某个区间内每天的总量，用于趋势图 */
export async function totalsByDay(days: string[]): Promise<Record<string, Macro>> {
  const rows = await db.entries.where('day').anyOf(days).toArray()
  const grouped: Record<string, Macro[]> = {}
  for (const row of rows) {
    ;(grouped[row.day] ??= []).push({ kcal: row.kcal, p: row.p, f: row.f, c: row.c })
  }
  const result: Record<string, Macro> = {}
  for (const day of days) {
    result[day] = sumMacros(grouped[day] ?? [])
  }
  return result
}

// ------------------------------------------------------------------
// 食物库
// ------------------------------------------------------------------
export async function allFoods(): Promise<Food[]> {
  const custom = await db.customFoods.toArray()
  return custom.length > 0 ? [...custom, ...FOODS] : FOODS
}

export interface CustomFoodInput {
  name: string
  kcal: number
  p: number
  f: number
  c: number
  portionGrams: number
}

export async function addCustomFood(input: CustomFoodInput): Promise<Food> {
  const food: Food = {
    id: `c${Date.now().toString(36)}`,
    name: input.name.trim(),
    aliases: [],
    category: '自定义',
    per100: { kcal: input.kcal, p: input.p, f: input.f, c: input.c },
    portions: [{ name: '份', grams: input.portionGrams }],
    source: '用户自定义',
    custom: true,
  }
  await db.customFoods.add(food)
  return food
}

// ------------------------------------------------------------------
// 收藏
// ------------------------------------------------------------------
export async function favoriteIds(): Promise<string[]> {
  const rows = await db.favorites.toArray()
  return rows.sort((a, b) => b.addedAt - a.addedAt).map((row) => row.foodId)
}

export async function toggleFavorite(foodId: string): Promise<boolean> {
  const existing = await db.favorites.get(foodId)
  if (existing) {
    await db.favorites.delete(foodId)
    return false
  }
  await db.favorites.put({ foodId, addedAt: Date.now() })
  return true
}

// ------------------------------------------------------------------
// 导入导出（唯一可靠的兜底：iOS 可能清理站点存储）
// ------------------------------------------------------------------
export interface BackupPayload {
  app: 'shike'
  version: 1
  exportedAt: string
  data: {
    entries: Entry[]
    targets: Target[]
    profile: ProfileRow[]
    customFoods: Food[]
    favorites: { foodId: string; addedAt: number }[]
  }
}

export async function exportBackup(): Promise<BackupPayload> {
  const [entries, targets, profile, customFoods, favorites] = await Promise.all([
    db.entries.toArray(),
    db.targets.toArray(),
    db.profile.toArray(),
    db.customFoods.toArray(),
    db.favorites.toArray(),
  ])
  return {
    app: 'shike',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { entries, targets, profile, customFoods, favorites },
  }
}

export interface ImportResult {
  entries: number
  customFoods: number
}

/** 彻底删除本机全部数据：记录、目标、档案、自定义食物、收藏 */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.entries, db.targets, db.profile, db.customFoods, db.favorites],
    async () => {
      await Promise.all([
        db.entries.clear(),
        db.targets.clear(),
        db.profile.clear(),
        db.customFoods.clear(),
        db.favorites.clear(),
      ])
    },
  )
}

/** 覆盖式导入：先清空再写入，避免主键冲突造出重复记录 */
export async function importBackup(payload: unknown): Promise<ImportResult> {
  const data = (payload as BackupPayload | null)?.data
  if (!data || !Array.isArray(data.entries)) {
    throw new Error('备份文件格式不正确')
  }

  await db.transaction(
    'rw',
    [db.entries, db.targets, db.profile, db.customFoods, db.favorites],
    async () => {
      await Promise.all([
        db.entries.clear(),
        db.targets.clear(),
        db.profile.clear(),
        db.customFoods.clear(),
        db.favorites.clear(),
      ])
      await db.entries.bulkAdd(data.entries)
      await db.targets.bulkAdd(data.targets ?? [])
      await db.profile.bulkAdd(data.profile ?? [])
      await db.customFoods.bulkAdd(data.customFoods ?? [])
      await db.favorites.bulkAdd(data.favorites ?? [])
    },
  )

  return { entries: data.entries.length, customFoods: (data.customFoods ?? []).length }
}
