import { useMemo, useState } from 'react'
import { bandMeta } from '../utils/bands.js'
import { groupRoster, buildPulseIndex, pulseMonths } from '../utils/parsePulse.js'
import { taiwanIndex, rankIndex, shiftYm, LEVEL_LABEL } from '../utils/forecast.js'
import { todayStr } from '../utils/datetime.js'
import Icon from './Icon.jsx'

// 聲優動態：左邊是人，右邊是一條「節奏軌」——每個月一根柱子，
// 柱子高＝那個月在日本有多忙，粉紅那根＝那個月人在台灣。
// 上面再壓一排來台指數，把「日本很活躍 + 很久沒來」翻譯成一個看得懂的分數。
export default function PulsePage({ roster, pulse, events, source, onSelectEvent }) {
  const [sel, setSel] = useState(null)          // { name, ym|null }
  const [openIndex, setOpenIndex] = useState(null)

  const groups = useMemo(() => groupRoster(roster), [roster])
  const index = useMemo(() => buildPulseIndex(pulse, events, roster), [pulse, events, roster])
  const months = useMemo(() => pulseMonths(pulse, events), [pulse, events])

  const today = todayStr()
  const nextYm = shiftYm(today.slice(0, 7), 1)
  const ranked = useMemo(
    () => rankIndex(roster, { events, pulse, targetYm: nextYm, today }),
    [roster, events, pulse, nextYm, today])

  const confirmed = ranked.filter(r => r.scheduled)
  const pending = ranked.filter(r => !r.scheduled)
  const get = (name, ym) => index.get(`${name}|${ym}`) || []

  if (!roster.length || !months.length) {
    return (
      <section className="glass px-6 py-20 text-center">
        <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-bloom-indigo/10 text-bloom-indigo text-2xl">
          <Icon n="bolt" />
        </div>
        <div className="font-display font-bold text-xl text-dream-ink">
          {source === 'loading' ? '讀取動態中…' : '還沒有動態資料'}
        </div>

      </section>
    )
  }

  const maxCount = Math.max(1, ...roster.flatMap(r => months.map(m => get(r.name, m).length)))
  const selList = sel
    ? (sel.ym ? get(sel.name, sel.ym) : months.flatMap(m => get(sel.name, m)))
    : []

  return (
    <section className="flex flex-col gap-6">
      <div>
        <div className="eyebrow"><Icon n="bolt" className="text-[10px]" /> Pulse</div>
        <h2 className="section-h mt-1.5">聲優動態</h2>
        <p className="mt-2 text-[13px] text-dream-sub max-w-2xl">
          追蹤名單在日本的行程。每個月一根柱子，柱子越高那個月越忙；
          <span className="mx-1 font-bold" style={{ color: 'rgb(var(--c-urgent))' }}>粉紅</span>
        </p>
      </div>

      {/* ── 來台指數 ─────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h3 className="font-display font-bold text-[15px] text-dream-ink">
            {Number(nextYm.slice(5))} 月來台指數
          </h3>
          <span className="text-[11px] text-dream-faint">點卡片看分數怎麼來的</span>
        </div>
        {/* 已公告的不用猜，收成一行就好，指數卡的位子留給真的要判斷的 */}
        {confirmed.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
              style={{ background: 'rgb(var(--c-urgent))' }}>已公告</span>
            {confirmed.map(r => (
              <button key={r.name}
                onClick={() => onSelectEvent?.(r.events[0].id)}
                className="text-dream-ink hover:text-bloom-violet transition-colors">
                {r.name}
                <span className="text-dream-faint text-[11px] ml-1">
                  {r.events[0].startDate?.slice(5).replace('-', '/')}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pending.slice(0, 6).map(r => (
            <IndexCard key={r.name} item={r}
              open={openIndex === r.name}
              onToggle={() => setOpenIndex(openIndex === r.name ? null : r.name)}
              onSelectEvent={onSelectEvent} />
          ))}
        </div>
        <p className="mt-2.5 text-[11px] text-dream-faint leading-relaxed">
        </p>
      </div>

      {/* ── 節奏軌 ──────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {groups.map(g => {
          const m = bandMeta(g.band)
          const rows = [...(g.lead ? [g.lead] : []), ...g.members]
          return (
            // 用 glass 而不是 event-card：event-card 的樂團色背景會把整張卡染成團色，
            // PoPiPa 那種粉色團會跟「來台」的紅撞在一起。改成只在左邊留一條色帶。
            <div key={g.band} className="glass p-4 sm:p-5 border-l-4" style={{ borderLeftColor: m.color }}>
              <div className="flex items-center gap-2 mb-3">
                <Icon n={m.icon} className="text-[11px]" style={{ color: m.color }} />
                <span className="font-display font-bold text-[15px]" style={{ color: m.color }}>{g.band}</span>
                <span className="flex-1 h-px bg-dream-line dark:bg-white/10" />
              </div>

              {/* 月份刻度：跟下面的柱子用同一組寬度，才對得齊 */}
              <div className="flex items-center gap-3 mb-1.5">
                <span className="w-[104px] sm:w-[124px] shrink-0" />
                <div className="flex gap-[3px]">
                  {months.map(ym => (
                    <span key={ym} className="w-[26px] sm:w-[30px] text-center font-round text-[11px] text-dream-faint">
                      {Number(ym.slice(5))}
                    </span>
                  ))}
                </div>
              </div>

              <ul className="flex flex-col">
                {rows.map(r => (
                  <TrackRow key={r.name} entry={r} color={m.color} glow={m.glow}
                    months={months} get={get} maxCount={maxCount}
                    sel={sel} onSelect={setSel} />
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* ── 細節 ────────────────────────────────── */}
      {sel && (
        <div className="glass p-5">
          <div className="flex items-baseline gap-2.5 flex-wrap mb-3">
            <span className="font-display font-bold text-[17px] text-dream-ink">{sel.name}</span>
            <span className="text-[13px] text-dream-faint">
              {sel.ym ? `${Number(sel.ym.slice(5))} 月` : '全部'} · {selList.length} 筆
            </span>
            <button onClick={() => setSel(null)} className="ml-auto text-[11px] text-dream-faint hover:text-bloom-rose">關閉</button>
          </div>
          {selList.length === 0 ? (
            <p className="text-[13px] text-dream-faint">這個月沒有紀錄。</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {[...selList].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((it, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px]">
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={it.where === 'tw'
                      ? { background: 'rgb(var(--c-urgent))', color: '#fff' }
                      : { background: 'rgba(139,92,246,0.14)', color: '#8b5cf6' }}>
                    {it.where === 'tw' ? '來台' : it.mainType || '活動'}
                  </span>
                  <span className="min-w-0">
                    {it.where === 'tw' && onSelectEvent ? (
                      <button onClick={() => onSelectEvent(it.id)} className="text-left text-dream-ink hover:text-bloom-violet transition-colors">{it.title}</button>
                    ) : it.url ? (
                      <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-dream-ink hover:text-bloom-violet transition-colors">{it.title}</a>
                    ) : (
                      <span className="text-dream-ink">{it.title}</span>
                    )}
                    <span className="text-[11px] text-dream-faint ml-1.5">
                      {it.date?.replace(/-/g, '.')}{it.place && ` · ${it.place}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

// 一個人一條軌：名字 + 每月一根柱子
function TrackRow({ entry, color, glow, months, get, maxCount, sel, onSelect }) {
  const active = sel?.name === entry.name
  return (
    <li className="flex items-center gap-3 py-1 rounded-lg hover:bg-black/[.03] dark:hover:bg-white/[.04] transition-colors">
      <button
        onClick={() => onSelect(active && !sel.ym ? null : { name: entry.name, ym: null })}
        title={entry.role || entry.name}
        className={`w-[104px] sm:w-[124px] shrink-0 text-left text-[13px] truncate transition-colors ${
          entry.kind === 'band' ? 'font-display font-bold' : ''
        } ${active ? 'text-bloom-violet' : 'text-dream-ink hover:text-bloom-violet'}`}
      >
        {entry.name}
      </button>

      <div className="flex gap-[3px] items-end">
        {months.map(ym => {
          const list = get(entry.name, ym)
          const jp = list.filter(x => x.where === 'jp').length
          const tw = list.some(x => x.where === 'tw')
          const on = active && sel.ym === ym
          const h = list.length ? 8 + Math.round((list.length / maxCount) * 18) : 4
          return (
            <button key={ym}
              onClick={() => onSelect(on ? null : { name: entry.name, ym })}
              disabled={!list.length}
              aria-label={`${entry.name} ${Number(ym.slice(5))} 月，日本 ${jp} 筆${tw ? '，有來台' : ''}`}
              title={`${Number(ym.slice(5))} 月 · 日本 ${jp} 筆${tw ? '・有來台' : ''}`}
              className={`w-[26px] sm:w-[30px] h-[34px] flex flex-col justify-end items-center gap-[3px] rounded-[5px] transition-opacity ${
                list.length ? 'cursor-pointer hover:opacity-75' : 'cursor-default'
              } ${on ? 'ring-2 ring-dream-ink' : ''}`}
            >
              {/* 來台的月份在柱子上方插一顆紅點 —— PoPiPa 這種本來就是粉色的團，
                  光靠顏色分不出「日本」還是「台灣」，所以另外給一個形狀 */}
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: tw ? 'rgb(var(--c-urgent))' : 'transparent' }} />
              <span className="w-full rounded-[4px]"
                style={{
                  height: h,
                  background: tw
                    ? 'rgb(var(--c-urgent))'
                    : list.length
                      ? `rgba(${glow}, ${0.35 + (list.length / maxCount) * 0.55})`
                      : 'rgb(var(--c-line))',
                }} />
            </button>
          )
        })}
      </div>
    </li>
  )
}

// 來台指數卡：分數條 + 可展開的計分依據
function IndexCard({ item, open, onToggle, onSelectEvent }) {
  const done = item.scheduled
  const tone = done
    ? 'rgb(var(--c-urgent))'
    : item.level === 'high' ? '#8b5cf6'
    : item.level === 'mid' ? '#a855f7'
    : '#9c94be'

  return (
    <div className="glass p-4 flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display font-bold text-[15px] text-dream-ink truncate">{item.name}</span>
        <span className="text-[11px] font-bold shrink-0" style={{ color: tone }}>
          {LEVEL_LABEL[item.level]}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-2 rounded-full bg-dream-line dark:bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${item.score}%`, background: done ? tone : `linear-gradient(90deg,#ec4899,${tone})` }} />
        </div>
        <span className="font-display font-extrabold text-[15px] tabular-nums" style={{ color: tone }}>
          {done ? '定' : item.score}
        </span>
      </div>

      {done ? (
        <button
          onClick={() => onSelectEvent?.(item.events[0].id)}
          className="text-left text-[12px] text-dream-sub hover:text-dream-ink transition-colors truncate">
          已公告：{item.events[0].title}
        </button>
      ) : (
        <>
          <button onClick={onToggle} className="text-left text-[11px] text-dream-faint hover:text-bloom-violet transition-colors">
            {open ? '收起依據' : `${item.factors.length} 個因子 · 看依據`}
          </button>
          {open && (
            <ul className="flex flex-col gap-1.5 pt-1 border-t border-dashed border-dream-line dark:border-white/10">
              {item.factors.map(f => (
                <li key={f.label} className="flex items-baseline gap-2 text-[12px]">
                  <span className="font-round font-bold w-7 shrink-0 tabular-nums" style={{ color: tone }}>+{f.pts}</span>
                  <span className="text-dream-ink shrink-0">{f.label}</span>
                  <span className="text-dream-faint truncate">{f.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
