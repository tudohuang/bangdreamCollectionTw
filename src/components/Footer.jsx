import Icon from './Icon.jsx'
import { REPORT_URL } from '../config.js'

function sourceText(source, updatedAt) {
  const t = updatedAt ? new Date(updatedAt).toLocaleString('zh-TW', { hour12: false }) : ''
  if (source === 'loading') return '資料更新中…'
  if (source === 'sheet') return `資料來源：Google Sheet（即時）${t ? ' · ' + t : ''}`
  if (source === 'cached') return `資料來源：本機快取${t ? ' · ' + t : ''}（背景更新中）`
  if (source === 'error') return '即時更新失敗，正在使用內建資料'
  return ''
}

export default function Footer({ source = 'bundled', updatedAt, onRetry }) {
  const txt = sourceText(source, updatedAt)
  return (
    <footer className="relative z-10 mt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-10">
        <div className="glass-soft px-6 sm:px-8 py-7 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-md bg-bloom-indigo text-white text-[13px]"><Icon n="music" /></span>
            <div>
              <div className="font-display font-bold text-[15px] text-dream-ink">邦邦來台圖鑑</div>
              <div className="text-[11px] text-dream-faint">Taiwan BanG Dream! Collection</div>
            </div>
          </div>
          <div className="text-[12.5px] text-dream-sub leading-relaxed sm:text-right">
            由台灣 fandom 用愛整理 <Icon n="heart" className="text-bloom-rose text-[11px]" /> 非營利、非官方<br className="hidden sm:block" />
            資料如有錯漏，歡迎一起補完這本圖鑑
            {REPORT_URL && <> ・ <a href={REPORT_URL} className="underline hover:text-dream-ink" target="_blank" rel="noopener noreferrer">資料回報</a></>}
            {txt && (
              <span className="block mt-1 text-[11px] text-dream-faint">
                {txt}
                {(source === 'error' || source === 'cached') && onRetry && (
                  <button onClick={onRetry} className="ml-2 underline hover:text-dream-ink">重試</button>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
