import { useEffect, useMemo, useState } from 'react'
import { MEAL_LABEL, MEAL_ORDER, guessMeal } from '../core/day'
import type { Food, Meal } from '../core/types'
import { defaultGrams, matchFoods, scale } from '../core/units'
import { addCustomFood, addEntry } from '../storage/repo'

interface AddSheetProps {
  open: boolean
  day: string
  foods: Food[]
  favorites: string[]
  onClose: () => void
  onAdded: (label: string) => void
  onToggleFavorite: (foodId: string) => void
}

export function AddSheet({
  open,
  day,
  foods,
  favorites,
  onClose,
  onAdded,
  onToggleFavorite,
}: AddSheetProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState('100')
  const [meal, setMeal] = useState<Meal>(guessMeal())
  const [customOpen, setCustomOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // 每次打开都回到初始状态，避免上次的搜索词残留
  useEffect(() => {
    if (!open) return
    setQuery('')
    setCategory(null)
    setSelected(null)
    setGrams('100')
    setMeal(guessMeal())
    setCustomOpen(false)
  }, [open])

  const categories = useMemo(() => {
    const seen: string[] = []
    for (const food of foods) {
      if (!food.custom && !seen.includes(food.category)) seen.push(food.category)
    }
    return seen
  }, [foods])

  const results = useMemo(() => {
    if (category) return foods.filter((food) => food.category === category)
    if (!query.trim()) {
      return foods.filter((food) => favorites.includes(food.id)).slice(0, 40)
    }
    return matchFoods(foods, query)
  }, [category, foods, query, favorites])

  if (!open) return null

  const gramsNumber = Number(grams)
  const validGrams = Number.isFinite(gramsNumber) && gramsNumber > 0
  const preview = selected && validGrams ? scale(selected.per100, gramsNumber) : null

  async function submit() {
    if (!selected || !validGrams || saving) return
    setSaving(true)
    try {
      await addEntry({ food: selected, grams: gramsNumber, meal, day })
      onAdded(`${selected.name} ${gramsNumber}g`)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <h2>{selected ? '记录份量' : customOpen ? '新建食物' : '添加食物'}</h2>
          <button className="sheet-close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>

        {customOpen ? (
          <CustomFoodForm
            onCancel={() => setCustomOpen(false)}
            onCreated={(food) => {
              setCustomOpen(false)
              setSelected(food)
              setGrams(String(defaultGrams(food)))
            }}
          />
        ) : selected ? (
          <div className="detail">
            <h3>{selected.name}</h3>
            <div className="src">
              {selected.source} · 每 100g 可食部 {selected.per100.kcal} kcal（蛋白{' '}
              {selected.per100.p}g / 脂肪 {selected.per100.f}g / 碳水 {selected.per100.c}g）
            </div>

            <div className="big-input">
              <input
                type="number"
                inputMode="decimal"
                value={grams}
                autoFocus
                min={1}
                step={10}
                onChange={(event) => setGrams(event.target.value)}
              />
              <span>克</span>
            </div>

            <div className="portion-row">
              {selected.portions.map((portion) => (
                <button
                  key={portion.name}
                  className={`pill ${Number(grams) === portion.grams ? 'active' : ''}`}
                  onClick={() => setGrams(String(portion.grams))}
                >
                  {portion.name} {portion.grams}g
                </button>
              ))}
              {[50, 100, 150, 200]
                .filter((value) => !selected.portions.some((portion) => portion.grams === value))
                .map((value) => (
                  <button
                    key={value}
                    className={`pill ${Number(grams) === value ? 'active' : ''}`}
                    onClick={() => setGrams(String(value))}
                  >
                    {value}g
                  </button>
                ))}
            </div>

            <div className="preview">
              <div>
                <b>{preview?.kcal ?? 0}</b>
                <small>kcal</small>
              </div>
              <div>
                <b>{preview?.p ?? 0}</b>
                <small>蛋白 g</small>
              </div>
              <div>
                <b>{preview?.f ?? 0}</b>
                <small>脂肪 g</small>
              </div>
              <div>
                <b>{preview?.c ?? 0}</b>
                <small>碳水 g</small>
              </div>
            </div>

            <div className="field">
              <label>记入哪一餐</label>
              <div className="portion-row" style={{ margin: 0 }}>
                {MEAL_ORDER.map((item) => (
                  <button
                    key={item}
                    className={`pill ${meal === item ? 'active' : ''}`}
                    onClick={() => setMeal(item)}
                  >
                    {MEAL_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" disabled={!validGrams || saving} onClick={submit}>
              {saving ? '添加中…' : '添加'}
            </button>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 10 }}
              onClick={() => setSelected(null)}
            >
              返回搜索
            </button>
          </div>
        ) : (
          <>
            <div className="search">
              <span style={{ color: 'var(--ink-3)' }}>⌕</span>
              <input
                value={query}
                autoFocus
                placeholder="搜食物，比如「米饭」「鸡胸」"
                onChange={(event) => {
                  setQuery(event.target.value)
                  setCategory(null)
                }}
              />
              {query && (
                <button style={{ color: 'var(--ink-3)' }} onClick={() => setQuery('')}>
                  ×
                </button>
              )}
            </div>

            <div className="chips">
              <button
                className={`chip ${category === null && !query ? 'active' : ''}`}
                onClick={() => {
                  setCategory(null)
                  setQuery('')
                }}
              >
                常吃
              </button>
              {categories.map((item) => (
                <button
                  key={item}
                  className={`chip ${category === item ? 'active' : ''}`}
                  onClick={() => {
                    setCategory(item)
                    setQuery('')
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="list">
              {results.length === 0 && (
                <div className="empty" style={{ padding: '24px 10px' }}>
                  没有找到「{query}」
                </div>
              )}
              {results.map((food) => (
                <button
                  key={food.id}
                  className="food-row"
                  onClick={() => {
                    setSelected(food)
                    setGrams(String(defaultGrams(food)))
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="food-name">{food.name}</div>
                    <div className="food-sub">
                      {food.category} · 每 100g {food.per100.kcal} kcal
                      {food.custom ? ' · 自定义' : ''}
                    </div>
                  </div>
                  <span
                    className={`star ${favorites.includes(food.id) ? 'on' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label="收藏"
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleFavorite(food.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.stopPropagation()
                        onToggleFavorite(food.id)
                      }
                    }}
                  >
                    ★
                  </span>
                </button>
              ))}

              <button
                className="btn btn-ghost"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setCustomOpen(true)
                  setQuery('')
                }}
              >
                + 新建自定义食物
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CustomFoodForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void
  onCreated: (food: Food) => void
}) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [p, setP] = useState('')
  const [f, setF] = useState('')
  const [c, setC] = useState('')
  const [portion, setPortion] = useState('100')
  const [error, setError] = useState('')

  const num = (value: string) => (value.trim() === '' ? 0 : Number(value))

  async function save() {
    if (!name.trim()) {
      setError('给这个食物起个名字')
      return
    }
    if (num(kcal) <= 0) {
      setError('热量需要大于 0')
      return
    }
    const food = await addCustomFood({
      name: name.trim(),
      kcal: Math.round(num(kcal)),
      p: num(p),
      f: num(f),
      c: num(c),
      portionGrams: num(portion) > 0 ? num(portion) : 100,
    })
    onCreated(food)
  }

  return (
    <div className="detail">
      <div className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
        填每 100g 的营养值。家常菜没有标准数据，按你做的配方估算即可 —— 记录下来比记不准更重要。
      </div>
      <div className="field">
        <label>名称</label>
        <input value={name} placeholder="比如「妈妈牌红烧肉」" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>热量（kcal / 100g）</label>
        <input
          type="number"
          inputMode="decimal"
          value={kcal}
          onChange={(e) => setKcal(e.target.value)}
        />
      </div>
      <div className="field">
        <label>蛋白 / 脂肪 / 碳水（g / 100g）</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="蛋白"
            value={p}
            onChange={(e) => setP(e.target.value)}
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="脂肪"
            value={f}
            onChange={(e) => setF(e.target.value)}
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="碳水"
            value={c}
            onChange={(e) => setC(e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>一份大约多少克</label>
        <input
          type="number"
          inputMode="decimal"
          value={portion}
          onChange={(e) => setPortion(e.target.value)}
        />
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button className="btn btn-primary" onClick={save}>
        保存并选择
      </button>
      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={onCancel}>
        取消
      </button>
    </div>
  )
}
