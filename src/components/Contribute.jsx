import { REPORT_URL } from '../config.js'
import Icon from './Icon.jsx'

// 資料回報入口；config.js 沒設 REPORT_URL 就不顯示。
export default function Contribute() {
  if (!REPORT_URL) return null
  return (
    <div className="glass overflow-hidden">
      <div className="h-1.5 w-full"
        style={{ background: 'linear-gradient(90deg, #ec4899, #a855f7, #22d3ee, #a855f7, #ec4899)' }} />
      <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
        <div className="flex items-start gap-4">
          <span className="grid place-items-center w-12 h-12 rounded-full bg-bloom-rose/15 text-bloom-rose text-xl shrink-0">
            <Icon n="heart" />
          </span>
          <div>
            <h2 className="font-display font-bold text-xl text-dream-ink">幫忙補一筆</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-dream-sub max-w-lg">
              缺場次、有現場照片、或看到寫錯的地方？資料就是一張 Google Sheet，回報後很快會更新到站上。
            </p>
          </div>
        </div>
        <a href={REPORT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary shrink-0">
          <Icon n="link" /> 回報資料
        </a>
      </div>
    </div>
  )
}
