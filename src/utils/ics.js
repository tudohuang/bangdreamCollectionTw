// 把場次匯出成行事曆檔（.ics）。全日事件，不處理時刻 — Sheet 只有日期。
import { parseDate } from './datetime.js'
import { shareUrl } from './share.js'

const esc = (s) => String(s ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n')

const ymd = (d) => String(d || '').replace(/-/g, '')

// 全日事件的 DTEND 是「不含」的那天，所以結束日要 +1
function endExclusive(endDate, startDate) {
  const base = parseDate(endDate || startDate)
  if (!base) return null
  base.setDate(base.getDate() + 1)
  const p = (n) => String(n).padStart(2, '0')
  return `${base.getFullYear()}${p(base.getMonth() + 1)}${p(base.getDate())}`
}

// RFC 5545：每行不超過 75 octets，續行以一個空白開頭
function fold(line) {
  if (line.length <= 74) return line
  const out = [line.slice(0, 74)]
  let rest = line.slice(74)
  while (rest.length > 73) {
    out.push(' ' + rest.slice(0, 73))
    rest = rest.slice(73)
  }
  if (rest) out.push(' ' + rest)
  return out.join('\r\n')
}

function eventLink(event) {
  if (typeof location === 'undefined') return ''
  return shareUrl('event', event.id)
}

// 提醒。
//
// 這是「加到行事曆」真正的價值 —— 沒有提醒的話，那只是把一行字搬到另一個
// App 裡，使用者一樣會忘記。這站沒有後端、推播做不了，但使用者自己的行事曆
// 會替我們響，而且離線、關機、換手機都還在。
//
// 全日事件的 DTSTART 是當天 00:00，所以位移都從那裡算：
//   -P6DT15H  = 前 7 天的早上 9 點（還來得及請假、訂車票）
//   -PT15H    = 前一天的早上 9 點
function alarms(summary) {
  return [
    ['-P6DT15H', `一週後：${summary}`],
    ['-PT15H', `明天：${summary}`],
  ].flatMap(([trigger, text]) => [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `TRIGGER:${trigger}`,
    fold(`DESCRIPTION:${esc(text)}`),
    'END:VALARM',
  ])
}

// 已經過去的場次不掛提醒。觸發時間在過去本來就不會響，
// 但有些行事曆 App 匯入時會把它們一起列出來，看起來像壞掉。
const isFuture = (start, stamp) => start > String(stamp || '').slice(0, 8)

export function eventToVevent(event, stamp) {
  const start = ymd(event.startDate)
  const end = endExclusive(event.endDate, event.startDate)
  if (!start || !end) return null

  const desc = [
    `#${String(event.number ?? 0).padStart(3, '0')}`,
    (event.relatedGroups || []).join('、'),
    (event.people || []).join('、'),
    event.organizer && `主辦：${event.organizer}`,
    eventLink(event),
  ].filter(Boolean).join('\n')

  return [
    'BEGIN:VEVENT',
    `UID:${event.id}@bangdream-tw-collection`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    fold(`SUMMARY:${esc(event.title || '未命名活動')}`),
    event.venue ? fold(`LOCATION:${esc(event.venue)}`) : null,
    fold(`DESCRIPTION:${esc(desc)}`),
    eventLink(event) ? `URL:${eventLink(event)}` : null,
    ...(isFuture(start, stamp) ? alarms(event.title || '未命名活動') : []),
    'END:VEVENT',
  ].filter(Boolean).join('\r\n')
}

// 開賣日自成一則。
//
// 錯過開賣比錯過活動慘 —— 活動還能看直播，票沒搶到就是沒搶到。
// Sheet 只有日期沒有時刻（幾點開賣官方常常臨時改），所以做成全日事件，
// 提醒放前一天晚上 8 點與當天早上 8 點：多數開賣在中午，早上八點還來得及。
//
// 「開賣」那欄目前是空的。填了就會自己長出來，不用改程式。
export function ticketToVevent(event, stamp) {
  const day = ymd(event.ticketDate)
  if (!/^\d{8}$/.test(day)) return null
  const end = endExclusive(event.ticketDate, event.ticketDate)
  if (!end) return null

  const title = event.title || '未命名活動'
  const summary = `開賣：${title}`
  const desc = [event.ticketUrl, eventLink(event)].filter(Boolean).join('\n')

  return [
    'BEGIN:VEVENT',
    `UID:${event.id}-ticket@bangdream-tw-collection`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day}`,
    `DTEND;VALUE=DATE:${end}`,
    fold(`SUMMARY:${esc(summary)}`),
    desc ? fold(`DESCRIPTION:${esc(desc)}`) : null,
    event.ticketUrl ? `URL:${event.ticketUrl}` : null,
    ...(isFuture(day, stamp) ? [
      ['-PT4H', `明天開賣：${title}`],
      ['PT8H', `今天開賣：${title}`],
    ].flatMap(([trigger, text]) => [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:${trigger}`,
      fold(`DESCRIPTION:${esc(text)}`),
      'END:VALARM',
    ]) : []),
    'END:VEVENT',
  ].filter(Boolean).join('\r\n')
}

export function buildIcs(events, stamp) {
  const body = events.flatMap(e => [eventToVevent(e, stamp), ticketToVevent(e, stamp)]).filter(Boolean)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Taiwan BanG Dream Collection//TW//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...body,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

// 回傳實際寫進檔案的場次數（沒有合法日期的會被略過）
export function downloadIcs(events, filename = 'bangdream-tw.ics') {
  const list = Array.isArray(events) ? events : [events]
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const written = list.filter(e => eventToVevent(e, stamp))
  if (!written.length) return 0

  const blob = new Blob([buildIcs(written, stamp)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return written.length
}

// 存進行事曆。手機走系統分享單，桌機走下載。
//
// 為什麼不能只用 <a download>：iOS 加到主畫面之後沒有下載列，
// blob 下載按下去是靜默失敗的 —— 沒有檔案、沒有錯誤、沒有任何跡象。
// 而那正是最需要這個功能的情境（在手機上看到一場想去的，想被提醒）。
// 系統分享單裡有「加入行事曆」，那條路在 iOS 上是通的。
//
// 回傳的 alarms 是實際寫進去的提醒數，畫面靠它決定要不要說「會提醒你」——
// 已經過去的場次不掛提醒，這時候講「會提醒你」就是騙人。
export async function saveIcs(events, filename = 'bangdream-tw.ics') {
  const list = Array.isArray(events) ? events : [events]
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const written = list.filter(e => eventToVevent(e, stamp))
  if (!written.length) return { count: 0, alarms: 0, via: 'none' }

  const text = buildIcs(written, stamp)
  const alarms = (text.match(/BEGIN:VALARM/g) || []).length

  if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
    try {
      const file = new File([text], filename, { type: 'text/calendar' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] })
        return { count: written.length, alarms, via: 'share' }
      }
    } catch (e) {
      // 使用者自己在分享單按取消，不要再彈一次下載當作補償
      if (e?.name === 'AbortError') return { count: 0, alarms: 0, via: 'cancel' }
    }
  }

  return { count: downloadIcs(written, filename), alarms, via: 'download' }
}

// 按鈕按下去之後要說什麼。
//
// 兩個地方共用，因為文案必須一致：同一個功能在兩頁講不同的話，
// 使用者會以為是兩個不同的功能。
//
// 舊文案是「已下載行事曆檔」—— 那是在講程式做了什麼，不是在講使用者得到什麼。
// 使用者要的是「我不會忘記」。
export async function addToCalendar(events, filename, flash) {
  const { count, alarms, via } = await saveIcs(events, filename)
  if (via === 'cancel') return          // 使用者自己取消，不用回話
  if (!count) {
    flash?.(Array.isArray(events) ? '這些場次都還沒有確定日期' : '這場還沒有確定日期')
    return
  }
  // 已經結束的場次不掛提醒，這時候講「會提醒你」就是騙人
  flash?.(alarms ? '已加入行事曆 · 前一週和前一天會提醒你' : '已加入行事曆')
}
