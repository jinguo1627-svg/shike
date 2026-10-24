import { describe, expect, it } from 'vitest'
import { bmr, calorieTarget, dailyDelta, macroTarget, tdee } from '../src/core/nutrition'
import type { Profile } from '../src/core/types'

const man: Profile = {
  sex: 'male',
  age: 22,
  heightCm: 175,
  weightKg: 70,
  activity: 1.375,
  goal: 'maintain',
  rateKgPerWeek: 0,
}

const smallWoman: Profile = {
  sex: 'female',
  age: 60,
  heightCm: 150,
  weightKg: 40,
  activity: 1.2,
  goal: 'cut',
  rateKgPerWeek: 1,
}

describe('BMR / TDEE', () => {
  it('Mifflin-St Jeor 男性', () => {
    // 10*70 + 6.25*175 - 5*22 + 5 = 1688.75
    expect(bmr(man)).toBeCloseTo(1688.75, 2)
  })

  it('Mifflin-St Jeor 女性减 161', () => {
    // 10*40 + 6.25*150 - 5*60 - 161 = 876.5
    expect(bmr(smallWoman)).toBeCloseTo(876.5, 2)
  })

  it('TDEE 按活动系数放大', () => {
    expect(tdee(man)).toBeCloseTo(1688.75 * 1.375, 2)
  })
})

describe('每日目标', () => {
  it('维持目标等于 TDEE', () => {
    const result = calorieTarget(man)
    expect(result.kcal).toBe(2322)
    expect(result.delta).toBe(0)
    expect(result.clamped).toBe(false)
  })

  it('减脂 0.5kg/周 ≈ 550 kcal 缺口', () => {
    const cut: Profile = { ...man, goal: 'cut', rateKgPerWeek: 0.5 }
    expect(dailyDelta(cut)).toBeCloseTo(-550, 0)
    expect(calorieTarget(cut).kcal).toBe(1772)
  })

  it('缺口封顶 750，盈余封顶 500', () => {
    expect(dailyDelta({ ...man, goal: 'cut', rateKgPerWeek: 3 })).toBe(-750)
    expect(dailyDelta({ ...man, goal: 'bulk', rateKgPerWeek: 3 })).toBe(500)
  })

  it('低于安全下限时上调并标记', () => {
    const result = calorieTarget(smallWoman)
    expect(result.kcal).toBe(1200)
    expect(result.clamped).toBe(true)
    expect(result.floor).toBe(1200)
  })

  it('男性下限 1500', () => {
    const tiny: Profile = { ...man, weightKg: 45, heightCm: 160, age: 70, activity: 1.2, goal: 'cut', rateKgPerWeek: 1 }
    expect(calorieTarget(tiny).kcal).toBe(1500)
  })
})

describe('宏量分配', () => {
  it('三大营养素热量之和贴近总热量', () => {
    const macros = macroTarget(2000, 70, 'maintain')
    const total = macros.p * 4 + macros.f * 9 + macros.c * 4
    expect(Math.abs(total - 2000)).toBeLessThan(15)
  })

  it('减脂期蛋白按 1.6g/kg', () => {
    expect(macroTarget(2000, 70, 'cut').p).toBe(112)
  })

  it('占比之和接近 100%', () => {
    const macros = macroTarget(2200, 75, 'maintain')
    expect(macros.pPct + macros.fPct + macros.cPct).toBeGreaterThanOrEqual(99)
    expect(macros.pPct + macros.fPct + macros.cPct).toBeLessThanOrEqual(101)
  })

  it('极低热量时不会算出负碳水', () => {
    const macros = macroTarget(900, 100, 'cut')
    expect(macros.c).toBeGreaterThanOrEqual(0)
    expect(macros.f).toBeGreaterThanOrEqual(0)
  })
})
