// 「我有去」收藏標記（存 localStorage）
const KEY = 'bdtw-attended'

export function getAttended() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) }
  catch { return new Set() }
}

export function saveAttended(set) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])) } catch {}
}
