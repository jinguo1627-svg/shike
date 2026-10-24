import { describe, expect, it } from 'vitest'
import { addDays, dayRange, dayLabel, logicalDay, weekdayShort } from '../src/core/day'

const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime()

describe('逻辑日', () => {
  it('凌晨 1:30 算前一天', () => {
    expect(logicalDay(at(2024, 3, 2, 1, 30), 4)).toBe('2024-03-01')
  })

  it('凌晨 4:01 算当天', () => {
    expect(logicalDay(at(2024, 3, 2, 4, 1), 4)).toBe('2024-03-02')
  })

  it('起始小时设为 0 时按自然日切分', () => {
    expect(logicalDay(at(2024, 3, 2, 1, 30), 0)).toBe('2024-03-02')
  })

  it('跨月边界正确', () => {
    expect(logicalDay(at(2024, 4, 1, 2, 0), 4)).toBe('2024-03-31')
  })
})

describe('日期工具', () => {
  it('加减天数跨月', () => {
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01')
  })

  it('取连续 N 天，升序且以 end 结尾', () => {
    const days = dayRange('2024-03-07', 3)
    expect(days).toEqual(['2024-03-05', '2024-03-06', '2024-03-07'])
  })

  it('今天/昨天有中文标签', () => {
    expect(dayLabel('2024-03-07', '2024-03-07')).toBe('今天')
    expect(dayLabel('2024-03-06', '2024-03-07')).toBe('昨天')
    expect(dayLabel('2024-03-01', '2024-03-07')).toBe('3月1日')
  })

  it('星期几正确', () => {
    expect(weekdayShort('2024-03-01')).toBe('五')
    expect(weekdayShort('2024-03-03')).toBe('日')
  })
})
