import { useState } from 'react'
import { formatMonthDay } from '../utils/share.js'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { coverSrc } from '../utils/cover.js'
import { eventStatus, countdownLabel, weekday } from '../utils/datetime.js'
import { detectCity } from '../utils/derive.js'
import { isUrgent, URGENT_LABEL } from '../utils/urgency.js'
import Icon from './Icon.jsx'
import Cover from './Cover.jsx'

// 活動卡的資訊分級：封面 → 標題 → 日期與場館 → 樂團。
// 第二層（類型、人物、人次）平常收在封面下緣，滑過才浮出。
// 字級只用三階：15（標題）/ 13（日期行）/ 11（標籤與編號）。
export default function EventCard({ event, attended, onToggleAttended, onClick, milestone, priority = false }) {
  const [imgOk, setImgOk] = useState(true)
  const dex = `#${String(event.number ?? 0).padStart(3, '0')}`
  const sameDay = event.startDate === event.endDate
  const monthDay = formatMonthDay(event.startDate)
  const dayLabel = sameDay ? monthDay : `${monthDay} → ${formatMonthDay(event.endDate)}`
  const meta = primaryMeta(event)
  const personal = isPersonal(event)
  const cover = imgOk ? coverSrc(event) : null
  const status = eventStatus(event)
  const countdown = countdownLabel(event)
  const wd = weekday(event.startDate)
  const city = detectCity(event)
  const place = event.venue || city
  const urgent = isUrgent(event)
  // 已結束的場次退成回憶：封面降飽和，滑過才回到全彩
  const pastTone = status === 'past' ? 'saturate-[.62] group-hover:saturate-100' : ''
  // 第二層資訊：滑過才出現，平常不佔版面
  const extraBits = [
    event.type,
    (event.people || []).slice(0, 2).join('、') + ((event.people || []).length > 2 ? ` +${event.people.length - 2}` : ''),
    event.attendanceCount > 0 ? `${event.attendanceCount} 人` : '',
  ].filter(x => x && x.trim())

  return (
    <button
      onClick={onClick}
      className={`event-card card-lift group flex flex-col text-left ${urgent ? 'urgent-card' : ''}`}
      style={{ '--band': meta.glow }}
      aria-label={`${urgent ? `${URGENT_LABEL} ` : ''}${dex} ${event.title}`}
    >
      {/* 封面像貼上去的照片：四周留一圈紙、固定 3:2 版位 → 無 CLS */}
      <div className="p-2.5 pb-0">
      <div className="relative w-full aspect-[3/2] overflow-hidden rounded-xl shadow-[0_2px_8px_-4px_rgba(60,40,90,0.45)]">
        {cover ? (
          // sizes 告訴瀏覽器這張圖實際會顯示多寬，它才挑得到正確的檔案。
          // 手機一張佔滿一欄、平板兩欄、桌機三到四欄。
          <Cover event={event} size="sm" priority={priority}
            sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, (max-width: 1535px) 33vw, 25vw"
            className={`absolute inset-0 w-full h-full transition-[transform,filter] duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transform-none ${pastTone}`} />
        ) : (
          <NoCover meta={meta} dex={dex} icon={personal ? 'user' : meta.icon} />
        )}
        <span className="absolute inset-x-0 bottom-0 h-[3px] z-10" style={{ background: meta.color }} />

        {/* 左上：緊急與倒數；右上：打卡（去過就變成一枚蓋歪的章） */}
        {(urgent || countdown) && (
          <div className="absolute left-2.5 top-2.5 z-10 flex flex-col items-start gap-1">
            {urgent && (
              <span className="urgent-badge">
                <Icon n="triangle-exclamation" className="text-[9px]" /> {URGENT_LABEL}
              </span>
            )}
            {countdown && (
              <span className="rounded-full bg-bloom-indigo text-white px-2 py-0.5 text-[14px] font-bold shadow-sm">
                {countdown}
              </span>
            )}
          </div>
        )}
        <span
          role="button" tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onToggleAttended?.(event.id) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onToggleAttended?.(event.id) } }}
          aria-label={attended ? '取消已去過' : '標記我去過'}
          title={attended ? '已標記去過' : '標記我去過'}
          className={`absolute right-2.5 top-2.5 z-10 grid place-items-center rounded-full transition-colors ${
            attended
              ? 'stamp stamp-sm w-9 h-9 text-white'
              : 'w-7 h-7 bg-black/25 text-white/85 backdrop-blur-sm hover:bg-bloom-indigo'}`}
        >
          {attended
            ? <span className="font-hand font-bold text-[14px] leading-none">去過</span>
            : <Icon n="circle-check" className="text-[11px]" />}
        </span>
        {/* 里程碑：這場在收藏史上是個「第一次」或「隔最久」 */}
        {milestone && (
          <span className="absolute left-2.5 bottom-3 z-10 max-w-[calc(100%-24px)] inline-flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-sm pl-2 pr-2.5 py-1 text-[14px] font-bold text-white">
            <Icon n="star" className="text-[8px] shrink-0" style={{ color: meta.color }} />
            <span className="truncate">{milestone.label}</span>
          </span>
        )}

        {/* 第二層：滑過封面才從下緣升起（觸控裝置看不到，那邊直接點進詳情比較快） */}
        {extraBits.length > 0 && (
          <div aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden sm:flex items-center gap-2 px-3 py-2
              bg-gradient-to-t from-black/80 to-black/0 text-[14px] text-white/90
              translate-y-full opacity-0 transition-[transform,opacity] duration-300 ease-out
              group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none">
            {extraBits.map((b, i) => (
              <span key={i} className="truncate first:shrink-0 first:font-bold">{b}</span>
            ))}
          </div>
        )}
      </div>
      </div>

      <div className="flex flex-col gap-1.5 px-4 pt-3 pb-4">
        {/* 標題固定兩行高：一行的卡片不會讓底下那排 meta 高低不齊 */}
        <h3 className="font-display font-bold text-[16px] leading-snug text-dream-ink line-clamp-2 min-h-[2.6em] group-hover:text-bloom-violet transition-colors">
          {event.title || '未命名活動'}
        </h3>
        {/* 手寫那行：像自己在照片下面補記的日期與地點 */}
        <div className="font-hand text-[14px] leading-snug text-dream-sub flex items-baseline gap-1.5 min-w-0">
          {event.startDate ? (
            <span className="shrink-0 font-bold" style={{ color: meta.color }}>
              {event.year}.{dayLabel.replace(/^\d{4}\./, '')}{wd && `（${wd.replace('週', '')}）`}
            </span>
          ) : (
            <span className="shrink-0 text-dream-faint">日期未定</span>
          )}
          {place && <span className="truncate text-dream-faint">· {place}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 text-[14px] pt-0.5">
          <span className="inline-flex items-center gap-1.5 min-w-0" style={{ color: meta.color }}>
            <Icon n={personal ? 'user' : meta.icon} className="text-[10px] shrink-0" />
            <span className="truncate font-medium">{personal ? `個人 · ${meta.name}` : meta.name}</span>
          </span>
          <span className="font-round font-bold text-dream-faint shrink-0">{dex}</span>
        </div>
      </div>
    </button>
  )
}

// 沒封面不是「缺一張圖」，而是另一種版位：巨大描邊編號壓在樂團色斜紋上。
function NoCover({ meta, dex, icon }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden"
      style={{ background: `linear-gradient(150deg, rgba(${meta.glow},0.22), rgba(${meta.glow},0.06))` }}>
      <span className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: `repeating-linear-gradient(115deg, rgba(${meta.glow},0.18) 0 10px, transparent 10px 22px)`,
        }} />
      <span className="absolute inset-0 grid place-items-center font-display font-extrabold leading-none select-none"
        style={{
          fontSize: 'clamp(44px,7vw,62px)',
          WebkitTextStroke: `2px rgba(${meta.glow},0.55)`,
          color: 'transparent',
        }}>
        {dex}
      </span>
      <span className="absolute left-3 bottom-3 text-[16px]" style={{ color: meta.color }}>
        <Icon n={icon} />
      </span>
    </div>
  )
}
