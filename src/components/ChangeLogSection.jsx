import { ChangeFeed } from './JustAnnounced.jsx'
import Icon from './Icon.jsx'

// 更新日誌獨立成一段：看得出這份資料一直有人在顧，不是丟著長灰塵的靜態頁。
export default function ChangeLogSection({ events, onSelect }) {
  return (
    <section>
      <div className="mb-5">
        <div className="eyebrow"><Icon n="clock" className="text-[10px]" /> Changelog</div>
        <h2 className="section-h mt-2">最近改了什麼</h2>
      </div>
      <ChangeFeed events={events} onSelect={onSelect} limit={20} />
    </section>
  )
}
