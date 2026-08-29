import { useMemo, useState } from 'react'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { formatMonthDay } from '../utils/share.js'
import { downloadPassCard, passStats } from '../utils/passImage.js'
import { exportCode, importCode } from '../utils/backup.js'
import InstallCard from './InstallCard.jsx'
import Icon from './Icon.jsx'

// 我的收藏：把「我去過」的標記整理成個人紀錄。
export default function MePage({ events, attended, onToggleAttended, onReplaceAttended, onSelect, onBrowse }) {
  const mine = useMemo(() =>
    events
      .filter(e => attended.has(e.id))
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')),
    [events, attended])

  const stats = useMemo(() => {
    const years = [...new Set(mine.map(e => e.year).filter(Boolean))].sort()
    const count = {}
    for (const e of mine) for (const p of (e.people || [])) count[p] = (count[p] || 0) + 1
    const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
    const first = [...mine].reverse().find(e => e.startDate)
    return {
      total: mine.length,
      yearSpan: years.length ? (years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : `${years[0]}`) : '—',
      topPerson: top ? `${top[0]}` : '—',
      topCount: top ? top[1] : 0,
      firstTitle: first?.title || '',
      firstYear: first?.year || '',
    }
  }, [mine])

  if (!mine.length) {
    return (
      <section className="glass px-6 py-24 text-center">
        <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-bloom-indigo/10 text-bloom-indigo text-2xl">
          <Icon n="circle-check" />
        </div>
        <div className="font-display font-bold text-xl text-dream-ink">還沒有打卡紀錄</div>
        <p className="text-[16px] text-dream-sub mt-2 max-w-sm mx-auto">
          去圖鑑把你去過的場次打勾，這裡就是你的參戰紀錄。
        </p>
        <button onClick={onBrowse} className="btn-primary mt-6">
          去圖鑑打卡 <Icon n="arrow-right" className="text-[12px]" />
        </button>
        <div className="max-w-md mx-auto mt-10 text-left">
          <Backup attended={attended} onReplaceAttended={onReplaceAttended} />
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-6">
        <div className="eyebrow"><Icon n="circle-check" className="text-[10px]" /> My Collection</div>
        <h2 className="section-h mt-1.5">我的收藏</h2>
      </div>

      {/* 個人數據磚 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
        <StatTile value={stats.total} label="去過場次" sub="attended" />
        <StatTile value={stats.yearSpan} label="橫跨年份" sub="span" />
        <StatTile value={stats.topPerson} label={stats.topCount ? `見最多次 · ${stats.topCount} 場` : '見最多次'} sub="most seen" />
        <StatTile value={stats.firstYear || '—'} label={stats.firstTitle ? `第一場 · ${stats.firstTitle}` : '第一場'} sub="first show" />
      </div>

      {/* 季票是玩票性質，排在真正的紀錄後面 */}
      <PassProgress events={events} attended={attended} />

      {/* 去過的場次（新到舊） */}
      <ul className="space-y-2.5">
        {mine.map(e => {
          const m = primaryMeta(e)
          const md = e.startDate ? formatMonthDay(e.startDate).replace(/^\d{4}\./, '') : '未定'
          return (
            <li key={e.id}>
              <div className="event-card group w-full flex items-center gap-3 p-3.5" style={{ '--band': m.glow }}>
                <button onClick={() => onSelect(e.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  <span className="shrink-0 text-center w-14">
                    <span className="block font-round font-bold text-[14px]" style={{ color: m.color }}>{e.year}</span>
                    <span className="block text-[14px] text-dream-faint">{md}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-semibold text-[16px] text-dream-ink line-clamp-1 group-hover:text-bloom-violet transition-colors">
                      {e.title}
                    </span>
                    <span className="flex items-center gap-1.5 text-[14px] text-dream-sub">
                      <Icon n={isPersonal(e) ? 'user' : m.icon} className="text-[9px]" style={{ color: m.color }} />
                      {isPersonal(e) ? '個人' : m.name}
                      {e.venue && <span className="text-dream-faint truncate hidden sm:inline">· {e.venue}</span>}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => onToggleAttended(e.id)}
                  aria-label="取消打卡"
                  title="取消打卡"
                  className="shrink-0 grid place-items-center w-8 h-8 rounded-full bg-bloom-indigo text-white hover:bg-bloom-rose transition-colors"
                ><Icon n="circle-check" className="text-[12px]" /></button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-10 grid lg:grid-cols-2 gap-5 items-start">
        <Backup attended={attended} onReplaceAttended={onReplaceAttended} />
        <InstallCard />
      </div>
    </section>
  )
}

// 換裝置用的備份碼。沒有帳號，紀錄就只活在這台裝置的瀏覽器裡，
// 所以至少要讓它能被帶走 —— 一段字串，自己保管，貼回去就還原。
function Backup({ attended, onReplaceAttended }) {
  const code = useMemo(() => exportCode(attended), [attended])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setStatus({ ok: true, text: '備份碼已複製' })
    } catch {
      setStatus({ ok: false, text: '複製失敗，請手動選取' })
    }
  }

  const restore = () => {
    const parsed = importCode(draft)
    if (!parsed) return setStatus({ ok: false, text: '這段不是有效的備份碼' })
    onReplaceAttended(parsed.ids)
    setDraft('')
    setStatus({ ok: true, text: `已還原 ${parsed.numbers.length} 場參戰紀錄` })
  }

  return (
    <div className="glass p-5 sm:p-6">
      <h3 className="flex items-center gap-2.5 font-display font-bold text-[18px] text-dream-ink">
        <Icon n="clipboard" className="text-bloom-sky" /> 換裝置備份
      </h3>
      <p className="text-[14px] text-dream-sub mt-1.5 leading-relaxed">
        這站沒有帳號，打卡紀錄只存在這台裝置的瀏覽器。把下面這段複製起來自己保管，
        換手機時貼回去就會還原。
      </p>

      <label className="block mt-4 text-[14px] font-semibold text-dream-sub">我的備份碼</label>
      <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
        <input readOnly value={code || '（還沒有打卡紀錄）'} onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-lg border border-dream-line bg-white/70 px-3 py-2 font-mono text-[14px] text-dream-ink dark:bg-white/[.06] dark:border-white/15" />
        <button onClick={copy} disabled={!code} className="btn-ghost shrink-0 !h-11 sm:!h-auto disabled:opacity-40">複製</button>
      </div>

      <label className="block mt-4 text-[14px] font-semibold text-dream-sub">貼上備份碼還原</label>
      <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
        <input value={draft} onChange={(e) => { setDraft(e.target.value); setStatus(null) }}
          placeholder="BDTW:v2:…" spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-dream-line bg-white/70 px-3 py-2 font-mono text-[14px] text-dream-ink placeholder:text-dream-faint dark:bg-white/[.06] dark:border-white/15" />
        <button onClick={restore} disabled={!draft.trim()} className="btn-primary shrink-0 !h-11 sm:!h-auto disabled:opacity-40">還原</button>
      </div>

      <p aria-live="polite" className={`text-[14px] mt-2.5 ${status ? (status.ok ? 'text-bloom-indigo' : 'text-bloom-rose') : 'text-dream-faint'}`}>
        {status ? status.text : '還原會整份取代目前的紀錄，不會合併。'}
      </p>
    </div>
  )
}

// 季票等級與進度；數字由 passImage 的 passStats 算好
function PassProgress({ events, attended }) {
  const s = useMemo(() => passStats(events, attended), [events, attended])
  const tiers = [['紙票', 0], ['銀票', 15], ['金票', 35], ['黑卡', 60]]
  const nextTier = tiers.find(([, min]) => s.percent < min)
  const needed = nextTier ? Math.max(1, Math.ceil((nextTier[1] / 100) * s.all) - s.total) : 0

  return (
    <div className="glass p-5 sm:p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display font-extrabold text-[26px] text-dream-ink leading-none">{s.tier.name}</span>
            <span className="text-[14px] font-bold tracking-[0.22em] uppercase text-dream-faint">{s.tier.en}</span>
          </div>
          <div className="mt-1.5 text-[14px] text-dream-sub">
            走過 <span className="font-bold text-dream-ink">{s.total}</span> / {s.all} 筆 · {s.percent}%
            {nextTier && <span className="text-dream-faint"> · 再 {needed} 場升{nextTier[0]}</span>}
          </div>
        </div>
        <button className="btn-primary shrink-0" onClick={() => downloadPassCard(events, attended)}>
          <Icon n="star" /> 存成季票
        </button>
      </div>

      {/* 進度條：整條就是全站場次，亮起來的是你走過的 */}
      <div className="mt-4 h-2.5 rounded-full bg-dream-line dark:bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${Math.max(2, s.percent)}%`, background: 'linear-gradient(90deg,#ec4899,#8b5cf6)' }} />
      </div>
      <div className="mt-2 flex justify-between text-[14px] text-dream-faint">
        {tiers.map(([name, min]) => (
          <span key={name} className={s.percent >= min ? 'text-bloom-indigo font-bold' : ''}>{name}</span>
        ))}
      </div>

      {(s.streak > 1 || s.bestYear) && (
        <div className="mt-4 pt-4 border-t border-dashed border-dream-line dark:border-white/10 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-dream-sub">
          {s.streak > 1 && <span>連續參戰 <b className="text-dream-ink">{s.streak}</b> 年</span>}
          {s.bestYear && <span>最猛的一年 <b className="text-dream-ink">{s.bestYear.year}</b>（{s.bestYear.count} 場）</span>}
          {s.topBand && <span>最常見 <b className="text-dream-ink">{s.topBand.name}</b></span>}
        </div>
      )}
    </div>
  )
}

const StatTile = ({ value, label, sub }) => (
  <div className="glass p-4 sm:p-5">
    <div className="font-display text-[22px] sm:text-[26px] font-extrabold text-dream-ink leading-none truncate">{value}</div>
    <div className="mt-2 text-[14px] text-dream-sub line-clamp-1">{label}</div>
    <div className="mt-0.5 text-[14px] font-bold tracking-[0.18em] uppercase text-dream-faint">{sub}</div>
  </div>
)
