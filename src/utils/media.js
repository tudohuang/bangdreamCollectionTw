// 照片來源解析：同時支援「本機檔名」與「外部網址」
//   "evt-034-1.jpg"            → <base>/photos/evt-034-1.jpg（放在 public/photos/）
//   "https://i.imgur.com/x.jpg" → 原樣使用
export function photoUrl(p = '') {
  if (/^https?:\/\//i.test(p) || p.startsWith('data:')) return p
  if (p.startsWith('/')) return p
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${base}/photos/${p}`
}

// 取封面：優先 cover 欄，否則第一張照片
export function coverOf(event) {
  if (event.cover) return photoUrl(event.cover)
  const first = (event.photos || [])[0]
  return first ? photoUrl(first) : null
}
