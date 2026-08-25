// 觸覺回饋。
//
// 「像 App」有很大一部分不是視覺，是按下去手指有沒有感覺。
// 網頁能用的只有 navigator.vibrate（Android / Chrome；iOS Safari 沒有，
// 那邊就安靜地沒有回饋，不影響任何功能）。
//
// 只在「使用者主動做了一件有後果的事」時震，不是每次點擊都震 ——
// 到處震比不震還煩。

const can = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

// 極短的一下，用在切換分頁、開關收藏這種確認性的操作
export const tap = () => { if (can()) navigator.vibrate(8) }

// 稍長一點，用在完成了什麼（存檔、還原、下拉重新整理轉完）
export const done = () => { if (can()) navigator.vibrate([12, 40, 12]) }
