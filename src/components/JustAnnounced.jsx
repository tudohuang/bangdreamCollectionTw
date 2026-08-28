import { useMemo } from 'react'
import log from '../data/changelog.json' with { type: 'json' }
import { recentFeed, justAnnounced, daysAgoLabel, weeklyCount } from '../utils/changelog.js'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { formatMonthDay } from '../utils/share.js'
import { isUrgent, URGENT_LABEL } from '../utils/urgency.js'
import Icon from './Icon.jsx'

// 「最近公布」與「更新日誌」。
// 這站今年常常被偷襲，第一個問題永遠是「最近還有誰」，所以它排在首頁最前面。

const today = () => new Date().toISOString().slice(0, 10)

function Row({ item, onSelect, showKind }) {
  const { event: e, date, kind, fields } = item
  const m = primaryMeta(e)
  return (
    <button onClick={() => onSelect(e.id)}
      className="group w-full flex items-center gap-3 py-2.5 text-left border-b border-dream-line/70 last:border-0 dark:border-white/10">
      <span className="shrink-0 w-[52px] text-[14px] font-medium text-dream-faint tabular-nums">
        {daysAgoLabel(date, today())}
      </span>
      {/* 一列一行。原本標題下面還有一行「圖示 + 日期」，五列就是五行小字 ——
          日期挪到右邊自成一欄，對齊之後反而更好掃。
          只有「改了哪幾欄」還需要第二行，那是更新日誌才有的東西。 */}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5 min-w-0">
          {showKind && (
            <span className={`shrink-0 text-[14px] font-bold tracking-wider px-1.5 py-0.5 rounded ${
              kind === 'added' ? 'bg-bloom-rose/15 text-bloom-rose' : 'bg-dream-line text-dream-sub dark:bg-white/10'}`}>
              {kind === 'added' ? 'NEW' : '更新'}
            </span>
          )}
          {isUrgent(e) && (
            <span className="urgent-badge shrink-0">{URGENT_LABEL}</span>
          )}
          <Icon n={isPersonal(e) ? 'user' : m.icon} className="shrink-0 text-[9px]" style={{ color: m.color }} />
          <span className="min-w-0 truncate font-display font-semibold text-[14px] text-dream-ink group-hover:text-bloom-violet transition-colors">
            {e.title || '未命名活動'}
          </span>
        </span>
        {kind === 'changed' && fields?.length > 0 && (
          <span className="block truncate text-[14px] text-dream-faint">改了{fields.join('、')}</span>
        )}
      </span>
      <span className="shrink-0 text-[14px] text-dream-sub tabular-nums">
        {e.startDate ? formatMonthDay(e.startDate) : '日期未定'}
      </span>
      <Icon n="chevron-right" className="shrink-0 text-dream-faint group-hover:text-bloom-violet transition-colors" />
    </button>
  )
}

// 首頁第一屏左半：只列新公布、還沒結束的場次
export function JustAnnounced({ events, onSelect }) {
  const items = useMemo(() => justAnnounced(log, events, today()), [events])
  const week = useMemo(() => weeklyCount(log, today()), [])

  return (
    <div className="glass p-5 sm:p-6 h-full w-full min-w-0 flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display font-bold text-[18px] text-dream-ink">
          <Icon n="bolt" className="text-bloom-rose" /> 最近公布
        </h2>
        {week > 0 && (
          <span className="shrink-0 text-[14px] font-semibold px-2 py-1 rounded-full bg-bloom-rose/12 text-bloom-rose">
            本週 +{week}
          </span>
        )}
      </div>

      {items.length ? (
        <div className="mt-2 flex-1">
          {items.map(x => <Row key={x.event.id} item={x} onSelect={onSelect} />)}
        </div>
      ) : (
        <p className="mt-4 flex-1 text-[14px] text-dream-faint">
          最近沒有新公布的場次。這通常撐不了太久。
        </p>
      )}
    </div>
  )
}

// 完整的更新日誌：新增與異動都列，看得出這份資料一直有人在顧
export function ChangeFeed({ events, onSelect, limit = 20 }) {
  const items = useMemo(() => recentFeed(log, events, limit), [events, limit])
  if (!items.length) return null

  return (
    <div className="glass p-7">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink">
          <Icon n="clock" className="text-bloom-rose" /> 更新日誌
        </h3>
        <span className="text-[14px] text-dream-faint text-right">每次同步 Sheet 都會留下紀錄</span>
      </div>
      {items.map(x => <Row key={x.event.id + x.kind} item={x} onSelect={onSelect} showKind />)}
    </div>
  )
}
