import { describe, expect, it } from 'vitest'
import type { Food } from '../src/core/types'
import { defaultGrams, matchFoods, scale, sumMacros } from '../src/core/units'

const rice: Food = {
  id: '米饭',
  name: '米饭',
  aliases: ['白米饭', '大米饭'],
  category: '主食',
  per100: { kcal: 116, p: 2.6, f: 0.3, c: 25.9 },
  portions: [{ name: '碗', grams: 150 }],
  source: 'test',
}

const tomato: Food = {
  id: '番茄',
  name: '番茄',
  aliases: ['西红柿'],
  category: '蔬菜',
  per100: { kcal: 21, p: 0.9, f: 0.2, c: 4 },
  portions: [{ name: '个', grams: 150 }],
  source: 'test',
}

describe('份量换算', () => {
  it('150g 米饭 = 174 kcal', () => {
    expect(scale(rice.per100, 150)).toEqual({ kcal: 174, p: 3.9, f: 0.5, c: 38.9 })
  })

  it('1g 也能算出结果，不会因为除不尽变成 0', () => {
    const tiny = scale(rice.per100, 1)
    expect(tiny.p).toBe(0)
    expect(tiny.c).toBe(0.3)
  })

  it('默认为第一个份量', () => {
    expect(defaultGrams(rice)).toBe(150)
  })
})

describe('求和', () => {
  it('多条记录累加并保留一位小数', () => {
    const total = sumMacros([
      { kcal: 100, p: 10, f: 2, c: 5 },
      { kcal: 50, p: 5, f: 1, c: 2 },
    ])
    expect(total).toEqual({ kcal: 150, p: 15, f: 3, c: 7 })
  })

  it('空数组返回全零', () => {
    expect(sumMacros([])).toEqual({ kcal: 0, p: 0, f: 0, c: 0 })
  })
})

describe('检索', () => {
  const foods = [rice, tomato]

  it('精确名优先', () => {
    const results = matchFoods(foods, '米饭')
    expect(results[0].id).toBe('米饭')
  })

  it('别名可命中', () => {
    expect(matchFoods(foods, '西红柿')[0].id).toBe('番茄')
  })

  it('前缀命中排在包含之前', () => {
    const list: Food[] = [
      { ...rice, id: 'a', name: '糙米饭' },
      { ...rice, id: 'b', name: '米饭' },
    ]
    expect(matchFoods(list, '米饭')[0].id).toBe('b')
  })

  it('搜不到返回空数组', () => {
    expect(matchFoods(foods, '巧克力')).toHaveLength(0)
  })

  it('空关键词返回前若干条', () => {
    expect(matchFoods(foods, '')).toHaveLength(2)
  })
})
