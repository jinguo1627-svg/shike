import { useCallback, useEffect, useState } from 'react'
import { addDays, dayLabel, logicalDay } from './core/day'
import type { Entry, Food, Target } from './core/types'
import { AddSheet } from './features/AddSheet'
import { SettingsView } from './features/SettingsView'
import { TodayView } from './features/TodayView'
import { TrendsView } from './features/TrendsView'
import type { ProfileRow } from './storage/db'
import {
  allFoods,
  deleteEntry,
  entriesForDay,
  favoriteIds,
  getOrCreateTarget,
  getProfile,
  toggleFavorite,
} from './storage/repo'

type Tab = 'today' | 'trends' | 'settings'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'today', label: '今日' },
  { key: 'trends', label: '趋势' },
  { key: 'settings', label: '设置' },
]

function TabIcon({ tab }: { tab: Tab }) {
  if (tab === 'today') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.5 1.8" strokeLinecap="round" />
      </svg>
    )
  }
  if (tab === 'trends') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 19V11M12 19V6M19 19v-6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" strokeLinecap="round" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  )
}

export default function App() {
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [tab, setTab] = useState<Tab>('today')
  const [day, setDay] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [target, setTarget] = useState<Target | null>(null)
  const [foods, setFoods] = useState<Food[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [refresh, setRefresh] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState('')

  // 首次加载：档案决定逻辑日起点，食物库与收藏并行取
  useEffect(() => {
    void (async () => {
      const current = await getProfile()
      setProfile(current)
      setDay(logicalDay(Date.now(), current.dayStartHour))
      const [foodList, favList] = await Promise.all([allFoods(), favoriteIds()])
      setFoods(foodList)
      setFavorites(favList)
    })()
  }, [])

  // 某一天的数据：记录 + 当天生效的目标
  useEffect(() => {
    if (!day) return
    let alive = true
    void (async () => {
      const [list, dayTarget] = await Promise.all([entriesForDay(day), getOrCreateTarget(day)])
      if (!alive) return
      setEntries(list)
      setTarget(dayTarget)
    })()
    return () => {
      alive = false
    }
  }, [day, refresh])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 1800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const reload = useCallback(async () => {
    const current = await getProfile()
    setProfile(current)
    setFoods(await allFoods())
    setDay(logicalDay(Date.now(), current.dayStartHour))
    setRefresh((value) => value + 1)
  }, [])

  if (!profile) {
    return <div className="empty">正在打开本地数据…</div>
  }

  const today = logicalDay(Date.now(), profile.dayStartHour)
  const canForward = day < today

  return (
    <div className="app">
      <header className="topbar">
        <h1>食刻</h1>
        <div className="daynav">
          <button onClick={() => setDay(addDays(day, -1))} aria-label="前一天">
            ‹
          </button>
          <span className="day-label">{dayLabel(day, today)}</span>
          <button
            onClick={() => canForward && setDay(addDays(day, 1))}
            aria-label="后一天"
            style={{ opacity: canForward ? 1 : 0.3 }}
          >
            ›
          </button>
        </div>
      </header>

      {tab === 'today' && (
        <TodayView
          entries={entries}
          target={target}
          onDelete={async (id) => {
            await deleteEntry(id)
            setRefresh((value) => value + 1)
          }}
        />
      )}

      {tab === 'trends' && <TrendsView today={day} target={target} />}

      {tab === 'settings' && <SettingsView profile={profile} onSaved={reload} />}

      {tab === 'today' && (
        <button className="fab" onClick={() => setAddOpen(true)} aria-label="添加记录">
          +
        </button>
      )}

      <AddSheet
        open={addOpen}
        day={day}
        foods={foods}
        favorites={favorites}
        onClose={() => setAddOpen(false)}
        onAdded={(label) => {
          setRefresh((value) => value + 1)
          setToast(`已添加 ${label}`)
        }}
        onToggleFavorite={async (foodId) => {
          await toggleFavorite(foodId)
          setFavorites(await favoriteIds())
        }}
      />

      <nav className="tabbar">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`tab ${tab === item.key ? 'active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            <TabIcon tab={item.key} />
            {item.label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
