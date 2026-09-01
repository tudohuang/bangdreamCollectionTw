// 外連網址的辨識：這條連結是去哪裡的、屬於哪一類。
//
// 從 OfficialLinks.jsx 搬出來的。原因不是行數，是測不到 ——
// node 的測試跑不動 .jsx，所以只要純邏輯住在元件檔裡，
// 它就只能靠煙霧測試「有沒有 render 出來」間接驗，
// 而「uta-net 有沒有被歸成歌詞站」那種事，render 得出來不代表歸對了。

// 順序有意義：先比對到的贏。
// music.youtube.com 必須排在 youtube.com 前面，否則 YouTube Music 會被標成 YouTube。
const SITES = [
  [/(?:^|\.)x\.com|twitter\.com/i, 'X'],
  [/instagram\.com/i, 'Instagram'],
  [/music\.youtube\.com/i, 'YouTube Music'],
  [/youtube\.com|youtu\.be/i, 'YouTube'],
  [/open\.spotify\.com/i, 'Spotify'],
  [/music\.apple\.com/i, 'Apple Music'],
  [/(?:^|\.)kkbox\.com/i, 'KKBOX'],
  [/music\.line\.me/i, 'LINE MUSIC'],
  [/lnk\.to|linkco\.re|linkfire/i, '各平台'],
  [/(?:^|\.)uta-net\./i, '歌ネット'],
  [/(?:^|\.)utaten\./i, 'UtaTen'],
  [/(?:^|\.)j-lyric\./i, 'J-Lyric'],
  [/(?:^|\.)kashinavi\./i, '歌詞ナビ'],
  [/(?:^|\.)utamap\./i, 'うたまっぷ'],
  [/bandori\.party/i, 'Bandori.party'],
  [/(?:^|\.)vgmdb\.net/i, 'VGMdb'],
  [/eventernote\.com/i, 'Eventernote'],
  [/bandcamp\.com/i, 'Bandcamp'],
  [/twitcasting\.tv/i, 'ツイキャス'],
  [/note\.com/i, 'note'],
  [/tiktok\.com/i, 'TikTok'],
  [/bang-dream\.com/i, 'BanG Dream! 官網'],
]

// 按鈕上要寫什麼。認不出來的就顯示網域（去掉 www.），
// 至少看得出會被帶去哪裡 —— 一顆寫著「連結」的按鈕等於沒說。
export function linkLabel(url) {
  try {
    const host = new URL(url).hostname
    const hit = SITES.find(([re]) => re.test(host))
    return hit ? hit[1] : host.replace(/^www\./, '')
  } catch {
    return String(url ?? '')
  }
}

// 歌詞站。歌曲頁用它把連結分成兩排 ——
// 歌詞連結混在「去哪裡聽」那一排裡，那個標題就在說一件不是真的事。
//
// 用網域判斷不是用標籤判斷：按鈕上顯示的是站名（歌ネット、UtaTen），
// 因為「歌詞」那個標題底下再放一顆寫著「歌詞」的按鈕是廢話。
//
// 站上不放歌詞本文（版權在 Bushiroad 與 JASRAC 底下，歌詞站是付了授權金的），
// 所以「歌詞在哪」只能靠這一排連出去。
const LYRIC_HOSTS = /(?:^|\.)(?:uta-net|utaten|j-lyric|kashinavi|utamap)\./i

export function isLyricSite(url) {
  try {
    return LYRIC_HOSTS.test(new URL(url).hostname)
  } catch {
    return false
  }
}
