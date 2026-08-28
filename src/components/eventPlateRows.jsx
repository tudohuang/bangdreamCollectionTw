import { canonicalVenue } from '../utils/derive.js'
import { organizersOf } from '../utils/organizers.js'
import { URGENT_LABEL } from '../utils/urgency.js'
import { weekday } from '../utils/datetime.js'
import { formatDateRangeCompact } from '../utils/share.js'
import Icon from './Icon.jsx'

// 條目銘牌的每一列。
//
// 從 EventDetail 抽出來的原因：那支已經 650 行，而這一塊是純資料 ——
// 每一列就是「標籤、值、右邊那句脈絡」，跟浮層的手勢、鍵盤、燈箱完全無關。
// 混在一起的時候，想加一列要先捲過三百行互動邏輯。
//
// 回傳陣列給 <EntryPlate rows={...} />，false / undefined 的項目由它自己濾掉。

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

const isUrl = (v) => /^https?:\/\//i.test(String(v))

export function eventPlateRows({ event, ctx, meta, tags, extras, seriesPos, urgent, onClose }) {
  return [
    {
      label: '日期',
      value: formatDateRangeCompact(event.startDate, event.endDate) || '—',
      note: [weekday(event.startDate), ctx.ago].filter(Boolean).join(' · '),
    },

    event.venue && {
      label: '會場',
      value: (
        <span className="inline-flex items-start gap-1.5">
          {/* 主要連結是站內場館頁 —— 那是別的地方查不到的東西。
              Google 地圖降成旁邊的小圖示，不要整列都把人送走。 */}
          <a href={`#/venue/${encodeURIComponent(canonicalVenue(event.venue))}`} onClick={onClose}
            className="hover:text-bloom-violet transition-colors">
            {event.venue}
          </a>
          <a href={`https://www.google.com/maps/search/${encodeURIComponent(event.venue)}`}
            target="_blank" rel="noopener noreferrer" aria-label="在 Google 地圖上開啟"
            className="mt-1.5 shrink-0 opacity-50 hover:opacity-100 transition-opacity">
            <Icon n="link" className="text-[9px]" />
          </a>
        </span>
      ),
      note: ctx.venueTotal > 1 ? `這裡的第 ${ctx.venueNth} 場` : null,
    },

    // 系列：「Bushiroad EXPO 的第 4 次」是這站才查得到的東西
    seriesPos && {
      label: '系列',
      value: (
        <a href={`#/series/${encodeURIComponent(seriesPos.series.key)}`} onClick={onClose}
          className="hover:text-bloom-violet transition-colors">
          {seriesPos.series.name}
        </a>
      ),
      note: `這個系列的第 ${seriesPos.nth} 次・共 ${seriesPos.total} 次`,
    },

    {
      label: '編制',
      value: (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {urgent && (
            <span className="urgent-badge">
              <Icon n="triangle-exclamation" className="text-[9px]" /> {URGENT_LABEL}
            </span>
          )}
          <span>{event.category === '擦邊' ? '個人' : '本體'}</span>
          {event.isFullBand && <span style={{ color: meta.color }}>· 全團</span>}
          {tags.length > 0 && <span className="text-dream-sub">· {tags.join('・')}</span>}
        </span>
      ),
      note: event.attendanceCount > 0 ? `${event.attendanceCount} 人` : null,
    },

    event.organizer && {
      label: '主辦',
      value: (
        <span className="flex flex-wrap gap-x-2 gap-y-1">
          {organizersOf(event).map(name => (
            <a key={name} href={`#/org/${encodeURIComponent(name)}`}
              className="hover:text-bloom-violet transition-colors">{name}</a>
          ))}
        </span>
      ),
      note: ctx.organizerTotal > 1 ? `辦過的第 ${ctx.organizerNth} 場` : null,
    },

    event.ticketUrl && {
      label: '購票',
      value: (
        <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
          className="text-[14px] font-normal text-bloom-violet hover:underline break-all">
          {hostOf(event.ticketUrl)}
        </a>
      ),
    },

    // Sheet 加了程式不認得的欄位時，自動多一列。表頭就是顯示名稱。
    ...extras.map(([name, value]) => ({
      label: name,
      value: isUrl(value)
        ? <a className="text-[14px] font-normal text-bloom-violet hover:underline break-all"
            target="_blank" rel="noopener noreferrer" href={value}>{value}</a>
        : <span className="text-[14px] font-normal text-dream-sub whitespace-pre-line">{value}</span>,
    })),

    event.sources?.length > 0 && {
      label: '來源',
      value: (
        <span className="flex flex-col gap-1">
          {event.sources.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noopener noreferrer"
              className="text-[14px] font-normal text-dream-sub hover:text-bloom-violet transition-colors truncate">
              {hostOf(src)}
            </a>
          ))}
        </span>
      ),
    },
  ]
}
