// 把「分享連結」轉成可直接 <img> 顯示的網址。
// 一般人從雲端硬碟複製的是檢視頁網址，不是圖檔本身，直接貼會破圖；這裡幫忙轉。
//   Google Drive  …/file/d/<ID>/view、…/open?id=<ID>、…/uc?id=<ID>
//                 → https://drive.google.com/thumbnail?id=<ID>&sz=w2000（可直接內嵌）
//   Dropbox       …dropbox.com/…?dl=0  → 改走 dl.dropboxusercontent.com（raw）
export function normalizeImageUrl(url = '') {
  const u = url.trim()
  const drive = u.match(/drive\.google\.com\/(?:file\/d\/|uc\?(?:[^#]*&)?id=|open\?(?:[^#]*&)?id=|thumbnail\?(?:[^#]*&)?id=)([\w-]{20,})/)
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w2000`
  if (/dropbox\.com/i.test(u)) {
    return u.replace(/^https?:\/\/(www\.)?dropbox\.com/i, 'https://dl.dropboxusercontent.com')
            .replace(/[?&]dl=\d/i, '').replace(/[?&]raw=\d/i, '')
  }
  return u
}

// 照片來源解析：同時支援「本機檔名」與「外部網址（含 Drive / Dropbox 分享連結）」
//   "evt-034-1.jpg"             → <base>/photos/evt-034-1.jpg（放在 public/photos/）
//   "https://i.imgur.com/x.jpg" → 原樣使用
//   "https://drive.google.com/file/d/…/view" → 自動轉成可顯示的直連圖
export function photoUrl(p = '') {
  if (/^https?:\/\//i.test(p)) return normalizeImageUrl(p)
  if (p.startsWith('data:')) return p
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
