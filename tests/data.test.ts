import { describe, expect, it } from 'vitest'
import { kcalFromMacros } from '../src/core/nutrition'
import { CATEGORY_ORDER } from '../src/core/units'
import { FOODS } from '../src/data/foods'

/** 酒精 7 kcal/g，用 4/9/4 反算必然对不上，单独排除 */
const ALCOHOL = new Set(['啤酒', '红酒'])

describe('食物库完整性', () => {
  it('条目数量达到最低要求', () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(150)
  })

  it('名称唯一且非空', () => {
    const names = FOODS.map((food) => food.name)
    expect(new Set(names).size).toBe(names.length)
    for (const food of FOODS) {
      expect(food.name.trim().length).toBeGreaterThan(0)
      expect(food.id).toBe(food.name)
    }
  })

  it('每一条都有可用的份量', () => {
    for (const food of FOODS) {
      expect(food.portions.length).toBeGreaterThan(0)
      for (const portion of food.portions) {
        expect(portion.name.length).toBeGreaterThan(0)
        expect(portion.grams).toBeGreaterThan(0)
        expect(Number.isFinite(portion.grams)).toBe(true)
      }
    }
  })

  it('营养值非负且为有限数', () => {
    for (const food of FOODS) {
      for (const key of ['kcal', 'p', 'f', 'c'] as const) {
        const value = food.per100[key]
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('分类都在已知范围内', () => {
    const known = new Set<string>([...CATEGORY_ORDER, '自定义'])
    for (const food of FOODS) {
      expect(known.has(food.category)).toBe(true)
    }
  })
})

describe('营养值自洽性（4/9/4 法则）', () => {
  it('标称热量与三大营养素反算值偏差不超过 35%', () => {
    const offenders: string[] = []
    for (const food of FOODS) {
      if (ALCOHOL.has(food.name)) continue
      const computed = kcalFromMacros(food.per100)
      if (food.per100.kcal === 0) {
        expect(computed).toBe(0)
        continue
      }
      const drift = Math.abs(computed - food.per100.kcal) / food.per100.kcal
      if (drift > 0.35) {
        offenders.push(
          `${food.name}: 标称 ${food.per100.kcal} / 反算 ${computed.toFixed(1)}（偏差 ${(
            drift * 100
          ).toFixed(0)}%）`,
        )
      }
    }
    expect(offenders).toEqual([])
  })
})
