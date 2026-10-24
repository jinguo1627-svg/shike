/** 份量换算与食物检索。 */
import type { Food, Macro } from './types'

// 加一个极小的偏置，避免 38.85 被浮点误差舍成 38.8
const round1 = (n: number) => Math.round(n * 10 + (n >= 0 ? 1e-9 : -1e-9)) / 10

/** 按克数缩放每 100g 营养值 */
export function scale(per100: Macro, grams: number): Macro {
  const k = grams / 100
  return {
    kcal: Math.round(per100.kcal * k),
    p: round1(per100.p * k),
    f: round1(per100.f * k),
    c: round1(per100.c * k),
  }
}

export function defaultGrams(food: Food): number {
  return food.portions[0]?.grams ?? 100
}

/** 把多条营养值加起来，热量取整、克数保留一位小数 */
export function sumMacros(items: readonly Macro[]): Macro {
  const total = items.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      p: acc.p + m.p,
      f: acc.f + m.f,
      c: acc.c + m.c,
    }),
    { kcal: 0, p: 0, f: 0, c: 0 },
  )
  return {
    kcal: Math.round(total.kcal),
    p: round1(total.p),
    f: round1(total.f),
    c: round1(total.c),
  }
}

/**
 * 检索：精确名 > 前缀 > 包含 > 别名命中，
 * 同分时短名字优先（「米饭」排在「米饭（隔夜）」之前）。
 */
export function matchFoods(foods: Food[], query: string, limit = 40): Food[] {
  const q = query.trim().toLowerCase()
  if (!q) return foods.slice(0, limit)

  const hits: Array<{ food: Food; score: number }> = []
  for (const food of foods) {
    const name = food.name.toLowerCase()
    let score = 0
    if (name === q) score = 100
    else if (name.startsWith(q)) score = 80
    else if (name.includes(q)) score = 60
    else if (food.aliases.some((alias) => alias.toLowerCase().includes(q))) score = 40
    else if (food.category.toLowerCase().includes(q)) score = 10
    if (score > 0) hits.push({ food, score })
  }

  return hits
    .sort((a, b) => b.score - a.score || a.food.name.length - b.food.name.length)
    .slice(0, limit)
    .map((hit) => hit.food)
}

export const CATEGORY_ORDER = [
  '主食',
  '肉蛋',
  '水产',
  '蔬菜',
  '水果',
  '乳豆',
  '坚果',
  '菜肴',
  '零食',
  '饮品',
  '调味',
] as const
