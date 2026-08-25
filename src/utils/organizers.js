// 主辦單位的整理。
//
// 2026 年開始，主辦本身也變成台邦史的角色 —— 誰在做、做多少、常用哪個場館，
// 都是客觀可查的事實。這裡只算履歷，不做評分（評分會引戰，也不是這站的工作）。
import { isPersonal } from './bands.js'
import { detectCity, canonicalVenue } from './derive.js'

const clean = (s) => String(s || '').trim()

// 一場活動可能有多個主辦，用頓號／斜線分
export const organizersOf = (event) =>
  clean(event?.organizer).split(/[、,，/／]/).map(s => s.trim()).filter(Boolean)

const tally = (arr) =>
  [...arr.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))

export function organizerList(events = []) {
  const map = new Map()
  for (const e of events) {
    for (const name of organizersOf(e)) {
      if (!map.has(name)) map.set(name, [])
      map.get(name).push(e)
    }
  }
  return [...map.entries()]
    .map(([name, list]) => ({ name, count: list.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function organizerProfile(events = [], name) {
  const list = events
    .filter(e => organizersOf(e).includes(name))
    .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
  if (!list.length) return null

  const years = list.map(e => e.year).filter(Boolean)
  const byYear = tally(years).sort((a, b) => a[0] - b[0])

  return {
    name,
    list,
    count: list.length,
    core: list.filter(e => !isPersonal(e)).length,
    personal: list.filter(isPersonal).length,
    firstYear: years.length ? Math.min(...years) : null,
    lastYear: years.length ? Math.max(...years) : null,
    byYear,
    venues: tally(list.map(e => canonicalVenue(e.venue)).filter(Boolean)),
    cities: tally(list.map(detectCity).filter(Boolean)),
    people: tally(list.flatMap(e => e.people || [])),
    types: tally(list.map(e => clean(e.type)).filter(Boolean)),
  }
}
