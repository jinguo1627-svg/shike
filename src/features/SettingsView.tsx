import { useEffect, useRef, useState } from 'react'
import { calorieTarget, macroTarget } from '../core/nutrition'
import type { Activity, GoalType, Profile, Sex } from '../core/types'
import { exportBackup, importBackup, saveProfile, clearAllData } from '../storage/repo'
import type { ProfileRow } from '../storage/db'

interface SettingsViewProps {
  profile: ProfileRow
  onSaved: () => void
}

const ACTIVITY_OPTIONS: Array<{ value: Activity; label: string }> = [
  { value: 1.2, label: '久坐（几乎不运动）' },
  { value: 1.375, label: '轻度（每周 1–3 次）' },
  { value: 1.55, label: '中度（每周 3–5 次）' },
  { value: 1.725, label: '高强度（每周 6 次以上）' },
]

const GOAL_OPTIONS: Array<{ value: GoalType; label: string }> = [
  { value: 'cut', label: '减脂' },
  { value: 'maintain', label: '维持' },
  { value: 'bulk', label: '增肌' },
]

export function SettingsView({ profile, onSaved }: SettingsViewProps) {
  const [form, setForm] = useState({
    sex: profile.sex,
    age: String(profile.age),
    heightCm: String(profile.heightCm),
    weightKg: String(profile.weightKg),
    activity: String(profile.activity),
    goal: profile.goal,
    rateKgPerWeek: String(profile.rateKgPerWeek),
    dayStartHour: String(profile.dayStartHour),
  })
  const [msg, setMsg] = useState('')
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void navigator.storage
      ?.persisted?.()
      .then((value) => setPersisted(value))
      .catch(() => setPersisted(null))
  }, [])

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const draft: Profile = {
    sex: form.sex as Sex,
    age: Number(form.age) || 0,
    heightCm: Number(form.heightCm) || 0,
    weightKg: Number(form.weightKg) || 0,
    activity: (Number(form.activity) || 1.375) as Activity,
    goal: form.goal as GoalType,
    rateKgPerWeek: Number(form.rateKgPerWeek) || 0,
  }

  const valid = draft.age > 0 && draft.heightCm > 0 && draft.weightKg > 0
  const calc = valid ? calorieTarget(draft) : null
  const macros = calc ? macroTarget(calc.kcal, draft.weightKg, draft.goal) : null

  async function save() {
    if (!valid) {
      setMsg('先把年龄、身高、体重填完整')
      return
    }
    const rate = draft.goal === 'maintain' ? 0 : Math.abs(draft.rateKgPerWeek)
    await saveProfile({
      ...draft,
      rateKgPerWeek: rate,
      dayStartHour: Math.min(12, Math.max(0, Number(form.dayStartHour) || 0)),
    })
    setMsg('已保存，目标从今天起生效')
    onSaved()
  }

  async function download() {
    const payload = await exportBackup()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `shike-backup-${stamp}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMsg(`已导出 ${payload.data.entries.length} 条记录`)
  }

  async function upload(file: File) {
    try {
      const text = await file.text()
      const result = await importBackup(JSON.parse(text))
      setMsg(`已恢复 ${result.entries} 条记录`)
      onSaved()
    } catch (error) {
      setMsg(error instanceof Error ? error.message : '导入失败')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="card">
        <h3>身体数据</h3>
        <div className="field" style={{ marginTop: 12 }}>
          <label>性别</label>
          <select value={form.sex} onChange={(event) => set('sex', event.target.value)}>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>年龄</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.age}
              onChange={(event) => set('age', event.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>身高 cm</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.heightCm}
              onChange={(event) => set('heightCm', event.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>体重 kg</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.weightKg}
              onChange={(event) => set('weightKg', event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>活动量与目标</h3>
        <div className="field" style={{ marginTop: 12 }}>
          <label>日常活动量</label>
          <select value={form.activity} onChange={(event) => set('activity', event.target.value)}>
            {ACTIVITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>目标</label>
          <select value={form.goal} onChange={(event) => set('goal', event.target.value)}>
            {GOAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {form.goal !== 'maintain' && (
          <div className="field">
            <label>每周体重变化（kg）</label>
            <input
              type="number"
              inputMode="decimal"
              step={0.1}
              value={form.rateKgPerWeek}
              onChange={(event) => set('rateKgPerWeek', event.target.value)}
            />
            <div className="hint">健康区间约 0.5–1% 体重/周，超过 1 kg/周容易掉肌肉。</div>
          </div>
        )}
        <div className="field">
          <label>一天从几点开始算</label>
          <input
            type="number"
            inputMode="numeric"
            value={form.dayStartHour}
            onChange={(event) => set('dayStartHour', event.target.value)}
          />
          <div className="hint">
            默认 4 点。凌晨 1 点吃的夜宵会算进前一天，避免把一天拆成两半。
          </div>
        </div>
      </div>

      <div className="card">
        <h3>算出来的目标</h3>
        {calc && macros ? (
          <>
            <div className="stat-row">
              <div className="stat">
                <b className="num">{calc.bmr}</b>
                <small>基础代谢</small>
              </div>
              <div className="stat">
                <b className="num">{calc.tdee}</b>
                <small>总消耗</small>
              </div>
              <div className="stat">
                <b className="num" style={{ color: 'var(--accent)' }}>
                  {calc.kcal}
                </b>
                <small>每日目标</small>
              </div>
            </div>
            <div className="hint" style={{ marginTop: 12 }}>
              蛋白质 {macros.p}g（{macros.pPct}%）· 脂肪 {macros.f}g（{macros.fPct}%）· 碳水{' '}
              {macros.c}g（{macros.cPct}%）
              <br />
              {calc.delta === 0
                ? '与总消耗持平，体重维持在当前水平'
                : `相对总消耗 ${calc.delta > 0 ? '+' : ''}${calc.delta} kcal`}
              {calc.clamped && '（已触及安全下限，不再下调）'}
            </div>
          </>
        ) : (
          <div className="hint">填完身体数据后这里会显示结果</div>
        )}
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={save}>
          保存设置
        </button>
        {msg && <div className="hint" style={{ color: 'var(--accent)' }}>{msg}</div>}
      </div>

      <div className="card">
        <h3>数据</h3>
        <div className="hint" style={{ marginTop: 8 }}>
          {persisted === true
            ? '存储已持久化，浏览器不会主动清理。仍建议定期导出。'
            : '存储未持久化：iOS 清理站点数据时会连同记录一起删掉。请定期导出备份。'}
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={download}>
          导出备份（JSON）
        </button>
        <button
          className="btn btn-ghost"
          style={{ marginTop: 10 }}
          onClick={() => fileRef.current?.click()}
        >
          从备份恢复
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
          }}
        />
        <div className="hint">恢复会覆盖当前全部记录，操作前先导出一份。</div>
        <button
          className="btn btn-ghost"
          style={{ marginTop: 10, color: 'var(--danger)' }}
          onClick={async () => {
            const ok = window.confirm(
              '将删除这台设备上的全部记录、目标、身体数据和自定义食物，且无法撤销。确定继续？',
            )
            if (!ok) return
            await clearAllData()
            setMsg('已清空全部数据')
            onSaved()
          }}
        >
          删除全部数据
        </button>
      </div>

      <div className="card">
        <h3>关于</h3>
        <div className="hint" style={{ marginTop: 8, lineHeight: 1.9 }}>
          食刻 v0.1.0 · 离线优先的热量记录器
          <br />
          食物数据整理自 USDA FoodData Central（CC0）与公开营养资料，
          取常见品种均值，同种食物因产地与烹饪方式不同会有 ±20% 波动。
          <br />
          本工具不提供医疗建议。孕期、慢性病、进食障碍人群请遵医嘱。
          <br />
          <span className="badge" style={{ marginTop: 6, display: 'inline-block' }}>
            数据只存在这台设备 · 无账号 · 无网络请求
          </span>
        </div>
      </div>
    </div>
  )
}
