import Icon from './Icon.jsx'

// 官方連結：人物頁與樂團頁的「去哪裡看本人」。
//
// 這站是紀錄不是入口，但一個查完「愛美來過台灣幾次」的人，下一步就是
// 想知道她現在在幹嘛 —— 而站上完全沒有出口。這一排就是那個出口。
//
// 名字依網域自動判斷，不用在 Sheet 裡再填一次。
// 順序有意義：先比對到的贏。music.youtube.com 必須排在 youtube.com 前面，
// 否則 YouTube Music 的連結會被標成 YouTube。
//
// 歌詞站單獨標出來，因為它回答的是「歌詞在哪」——
// 這站不放歌詞本文（版權在 Bushiroad 與 JASRAC 底下，而且歌詞到處查得到；
// 「在台灣唱過幾次」才是只有這裡查得到的東西），所以連出去要看得出是歌詞。
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
  [/(?:^|\.)(?:utaten|uta-net|j-lyric|kashinavi|utamap)\./i, '歌詞'],
  [/bandori\.party/i, 'Bandori.party'],
  [/(?:^|\.)vgmdb\.net/i, 'VGMdb'],
  [/eventernote\.com/i, 'Eventernote'],
  [/bandcamp\.com/i, 'Bandcamp'],
  [/twitcasting\.tv/i, 'ツイキャス'],
  [/note\.com/i, 'note'],
  [/tiktok\.com/i, 'TikTok'],
  [/bang-dream\.com/i, 'BanG Dream! 官網'],
]

const labelOf = (url) => {
  try {
    const host = new URL(url).hostname
    const hit = SITES.find(([re]) => re.test(host))
    return hit ? hit[1] : host.replace(/^www\./, '')
  } catch { return url }
}

export default function OfficialLinks({ links = [], title = '官方連結' }) {
  const list = links.filter(Boolean)
  if (!list.length) return null

  return (
    <div className="mt-5">
      <div className="text-[14px] font-bold text-dream-faint mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        {list.map(url => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer nofollow"
            className="pill">
            {labelOf(url)}
            <Icon n="link" className="text-[9px] ml-1 opacity-50" />
          </a>
        ))}
      </div>
    </div>
  )
}
