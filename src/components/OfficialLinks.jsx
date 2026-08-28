import Icon from './Icon.jsx'

// 官方連結：人物頁與樂團頁的「去哪裡看本人」。
//
// 這站是紀錄不是入口，但一個查完「愛美來過台灣幾次」的人，下一步就是
// 想知道她現在在幹嘛 —— 而站上完全沒有出口。這一排就是那個出口。
//
// 名字依網域自動判斷，不用在 Sheet 裡再填一次。
const SITES = [
  [/(?:^|\.)x\.com|twitter\.com/i, 'X'],
  [/instagram\.com/i, 'Instagram'],
  [/youtube\.com|youtu\.be/i, 'YouTube'],
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
