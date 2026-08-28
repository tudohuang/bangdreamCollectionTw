// 上次看到哪。
//
// 這站有 59 筆、而且一直在長。回訪的人現在得從頭滾一次才找得到上次在看的
// 那一場 —— 尤其手機上，卡牆很長。
//
// 只存在瀏覽器裡，跟「我去過」一樣不上傳。存的也只有一個 id 與時間，
// 不記錄瀏覽軌跡。

const KEY = 'bdtw-last-seen'
// 超過兩週就不提了 —— 那已經不是「接著看」，是另一次造訪
const MAX_AGE_DAYS = 14

const store = () => (typeof localStorage === 'undefined' ? null : localStorage)

export function rememberSeen(id) {
  if (!id) return
  try {
    store()?.setItem(KEY, JSON.stringify({ id, at: Date.now() }))
  } catch { /* 無痕模式或空間滿了：記不住不是錯誤 */ }
}

export function getLastSeen(events = [], now = Date.now()) {
  let raw
  try { raw = store()?.getItem(KEY) } catch { return null }
  if (!raw) return null

  let rec
  try { rec = JSON.parse(raw) } catch { return null }
  if (!rec?.id || !rec?.at) return null

  const days = (now - rec.at) / 86400000
  if (days > MAX_AGE_DAYS || days < 0) return null

  const event = events.find(e => e.id === rec.id)
  if (!event) return null            // 那筆被刪掉或改了 id
  return { event, days }
}

export function clearLastSeen() {
  try { store()?.removeItem(KEY) } catch { /* 同上 */ }
}

// 「剛剛」「3 天前」——精確到小時沒有意義，這只是給人定位用的
export function agoLabel(days) {
  if (days < 0.04) return '剛剛'
  if (days < 1) return '今天'
  if (days < 2) return '昨天'
  return `${Math.floor(days)} 天前`
}
