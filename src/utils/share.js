export function formatDateRange(start, end) {
  if (!start) return ''
  if (!end || start === end) return start
  return `${start} → ${end}`
}

export function formatDateShort(d) {
  if (!d) return ''
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return d
  return `${Number(m[2])}/${Number(m[3])}`
}

export function formatMonthDay(d) {
  if (!d) return ''
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return d
  return `${m[2]}.${m[3]}`
}

// Threads 友善的活動摘要
export function buildSummary(event) {
  const dates = formatDateRange(event.startDate, event.endDate)
  const groups = (event.relatedGroups || []).join('、')
  const people = (event.people || []).join('、')
  const lines = [
    `#${String(event.number).padStart(3, '0')}  ${event.title}`,
    `[日期] ${dates}　[類型] ${event.type}　${event.category}${event.isFullBand ? '・全團' : ''}`,
  ]
  if (groups) lines.push(`[樂團] ${groups}`)
  if (people) lines.push(`[聲優] ${people}`)
  return lines.join('\n')
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (e) {
    // fallback for older browsers
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy'); document.body.removeChild(ta); return true }
    catch { document.body.removeChild(ta); return false }
  }
}
