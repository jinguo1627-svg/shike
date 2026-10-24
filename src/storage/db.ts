import Dexie, { type Table } from 'dexie'
import type { Entry, Food, Profile, Target } from '../core/types'

/** 档案是单例，额外带上逻辑日的起始小时 */
export interface ProfileRow extends Profile {
  id: number
  /** 一天从几点开始，默认 4 点，凌晨夜宵算前一天 */
  dayStartHour: number
}

export interface FavoriteRow {
  foodId: string
  addedAt: number
}

/**
 * 本地库。所有数据只存在这台设备上，没有任何网络同步。
 *
 * 索引说明：
 *  - entries 按 day 建索引，今日视图与趋势图都只查一到七个逻辑日
 *  - targets 按 effectiveFrom 建索引，查某一天的目标就是「取生效日期 <= 该天的最后一条」
 */
export class ShikeDB extends Dexie {
  entries!: Table<Entry, number>
  targets!: Table<Target, number>
  profile!: Table<ProfileRow, number>
  customFoods!: Table<Food, string>
  favorites!: Table<FavoriteRow, string>

  constructor() {
    super('shike')
    this.version(1).stores({
      entries: '++id, day, ts, meal, foodId',
      targets: '++id, effectiveFrom',
      profile: 'id',
      customFoods: 'id, name',
      favorites: 'foodId',
    })
  }
}

export const db = new ShikeDB()
